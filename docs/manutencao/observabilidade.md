---
description: Centralizar os logs de todos os containers no Grafana (Loki + Alloy) e expor com segurança pelo Dokploy.
---

# Observabilidade (Grafana + Loki)

Stack **gratuito e self-hosted** para pesquisar os logs de todos os containers do servidor:
app, Postgres, PostgREST, Traefik e o próprio Dokploy.

```
containers → Alloy (lê via docker.sock) → Loki (guarda N dias) → Grafana (tela, busca, alertas)
```

| Peça        | Função                                                         | Exposto?               |
| ----------- | -------------------------------------------------------------- | ---------------------- |
| **Loki**    | Banco de logs. Indexa só labels e comprime o texto             | **Nunca** (sem auth)   |
| **Alloy**   | Coletor. Descobre os containers e envia stdout/stderr ao Loki  | **Nunca**              |
| **Grafana** | Interface: Explore, dashboards e alertas                       | Sim, via domínio HTTPS |

Tudo é open source (Grafana OSS, Loki e Alloy, sob AGPLv3/Apache). O custo é só a RAM do
servidor, em torno de **300–500 MB** para o stack todo.

{% hint style="info" %}
**Por que não OpenSearch/Elastic?** Eles fazem o mesmo trabalho, mas pedem 2 GB+ de RAM (JVM)
e dão mais manutenção (índices, ISM, heap). Numa VPS com Dokploy, Loki é a escolha certa. Só
vale trocar se o volume passar de alguns GB de log por dia ou se precisar de busca full-text
pesada. Use **um ou outro**, nunca os dois.
{% endhint %}

## 1. Arquivos

No projeto consumidor ficam em `deploy/observability/`, na mesma rede externa `kizuna_net` dos
outros composes (`deploy/postgres-postgrest/`, `deploy/cloudbeaver/`).

```
deploy/observability/
├── docker-compose.yml
├── loki-config.yml
├── config.alloy
├── grafana/provisioning/datasources/loki.yml
├── grafana/provisioning/dashboards/kizuna.yml   # carrega a pasta abaixo
├── grafana/dashboards/kizuna-overview.json      # dashboard "Kizuna — Visão geral"
└── .env.example
```

{% tabs %}
{% tab title="docker-compose.yml" %}
```yaml
services:
  loki:
    image: grafana/loki:3.5.0
    restart: unless-stopped
    command: -config.file=/etc/loki/config.yml
    volumes:
      - ./loki-config.yml:/etc/loki/config.yml:ro
      - loki_data:/loki

  alloy:
    image: grafana/alloy:v1.9.1
    restart: unless-stopped
    command:
      - run
      - --server.http.listen-addr=0.0.0.0:12345
      - --storage.path=/var/lib/alloy/data
      - /etc/alloy/config.alloy
    volumes:
      - ./config.alloy:/etc/alloy/config.alloy:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - alloy_data:/var/lib/alloy/data
    depends_on: [loki]

  grafana:
    image: grafana/grafana-oss:12.0.2
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_USER: ${GRAFANA_ADMIN_USER:-admin}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:?defina GRAFANA_ADMIN_PASSWORD}
      GF_SERVER_ROOT_URL: ${GRAFANA_ROOT_URL:-}
      GF_USERS_ALLOW_SIGN_UP: "false"
      GF_AUTH_ANONYMOUS_ENABLED: "false"
      GF_ANALYTICS_REPORTING_ENABLED: "false"
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - ./grafana/dashboards:/etc/grafana/dashboards:ro
      - grafana_data:/var/lib/grafana
    depends_on: [loki]

volumes:
  loki_data:
  alloy_data:
  grafana_data:

networks:
  default:
    name: kizuna_net
    external: true
```
{% endtab %}

{% tab title="loki-config.yml" %}
```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  log_level: warn

common:
  instance_addr: 127.0.0.1
  path_prefix: /loki
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  retention_period: 720h          # 30 dias
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  allow_structured_metadata: true

compactor:
  working_directory: /loki/compactor
  retention_enabled: true
  delete_request_store: filesystem

analytics:
  reporting_enabled: false
```
{% endtab %}

{% tab title="config.alloy" %}
```
discovery.docker "containers" {
  host = "unix:///var/run/docker.sock"
}

discovery.relabel "containers" {
  targets = discovery.docker.containers.targets

  rule {
    source_labels = ["__meta_docker_container_name"]
    regex         = "/(.*)"
    target_label  = "container"
  }
  rule {
    source_labels = ["__meta_docker_container_label_com_docker_compose_project"]
    target_label  = "compose_project"
  }
  rule {
    source_labels = ["__meta_docker_container_label_com_docker_compose_service"]
    target_label  = "compose_service"
  }
  rule {
    source_labels = ["__meta_docker_container_log_stream"]
    target_label  = "stream"
  }
}

loki.source.docker "containers" {
  host          = "unix:///var/run/docker.sock"
  targets       = discovery.docker.containers.targets
  relabel_rules = discovery.relabel.containers.rules
  forward_to    = [loki.process.app.receiver]
}

loki.process "app" {
  stage.json {
    expressions = { level = "level" }
  }
  stage.labels {
    values = { level = "" }
  }
  forward_to = [loki.write.default.receiver]
}

loki.write "default" {
  endpoint {
    url = "http://loki:3100/loki/api/v1/push"
  }
}
```
{% endtab %}

{% tab title="datasource + .env" %}
```yaml
# grafana/provisioning/datasources/loki.yml
apiVersion: 1
datasources:
  - name: Loki
    type: loki
    uid: loki
    access: proxy
    url: http://loki:3100
    isDefault: true
    editable: false
```

```bash
# .env.example
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=troque-por-uma-senha-forte
GRAFANA_ROOT_URL=https://logs.seudominio.com.br
```
{% endtab %}
{% endtabs %}

## 2. Subir no Dokploy

1. **Create Service → Compose**, com o repositório e o caminho
   `deploy/observability/docker-compose.yml`.
2. **Environment:** `GRAFANA_ADMIN_USER`, `GRAFANA_ADMIN_PASSWORD` (obrigatória, e o deploy
   falha sem ela) e `GRAFANA_ROOT_URL`.
3. **Deploy.** A rede `kizuna_net` precisa existir (é criada pelo stack `postgres-postgrest`).

{% hint style="warning" %}
O compose monta as configs por **caminho relativo** (`./loki-config.yml`, …). Isso funciona
quando o Dokploy faz deploy **a partir do git**. Se você colar o compose direto na interface
("Raw"), recrie os arquivos em **Advanced → Mounts (File Mount)** com os mesmos caminhos.
{% endhint %}

## 3. Expor o Grafana (domínio + HTTPS)

**Não publique porta.** No Dokploy, quem expõe o serviço é o **Traefik**: ele recebe o tráfego
em 80/443 com certificado e repassa para a porta interna do container.

1. **DNS:** registro `A` de `logs.seudominio.com.br` para o IP do servidor.
2. **Dokploy → o compose → Domains → Add Domain:**

   | Campo          | Valor                        |
   | -------------- | ---------------------------- |
   | Host           | `logs.seudominio.com.br`     |
   | Service Name   | `grafana`                    |
   | Container Port | `3000`                       |
   | HTTPS          | ligado, com **Let's Encrypt** |

3. `GRAFANA_ROOT_URL` com a mesma URL, e **redeploy**.

**Deu 404 ou Bad Gateway?** O Traefik não está enxergando o container. Coloque o Grafana também
na rede do Dokploy:

```yaml
  grafana:
    # ...
    networks: [default, dokploy-network]

networks:
  default:
    name: kizuna_net
    external: true
  dokploy-network:
    external: true
```

{% hint style="danger" %}
**Por que não `ports: "3000:3000"`:** o Grafana ficaria em `http://IP:3000`, sem HTTPS e com a
senha em texto puro. Além disso, o Docker publica portas **por cima do UFW**, então a porta
fica aberta mesmo com o firewall "bloqueando". **Loki (3100) e Alloy (12345) nunca devem ser
expostos:** o Loki não tem autenticação, e quem chegar nele lê todos os logs.
{% endhint %}

**Proteção extra (opcional):** restringir o domínio a IPs conhecidos (middleware `ipAllowList`
do Traefik) ou colocar Basic Auth na frente (Dokploy → *Security*), para que a tela de login do
Grafana não fique aberta para a internet inteira.

## 4. Primeiro acesso

1. Entre com o usuário e a senha do `.env`.
2. **Connections → Data sources:** o **Loki** já aparece (vem provisionado, não editável).
3. **Dashboards → Kizuna → "Kizuna — Visão geral"**, que já vem pronto (veja abaixo).
4. **Explore → Loki** para consultas livres.
5. Crie usuários extras em **Administration → Users** em vez de compartilhar o admin.

Não é preciso expor Loki nem Alloy para ver logs: o Grafana consulta o Loki pela rede interna.

### Dashboard "Kizuna — Visão geral"

Provisionado de `grafana/dashboards/kizuna-overview.json` (provider em
`grafana/provisioning/dashboards/kizuna.yml`, pasta **Kizuna**).

| Linha      | Painéis                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------- |
| Contadores | Logins OK · Logins falhos · Lockouts · Captcha recusado · E-mails de reset · Falhas de e-mail    |
| Gráficos   | Volume de logs por serviço · Erros (stderr) por serviço · Eventos de autenticação no tempo        |
| Logs       | Erros do app (stderr) · Auth e e-mail · **Explorar**, com os filtros `Serviço` e `Buscar texto`   |

Variáveis no topo: **Serviço do app** (o `compose_service` do Next, padrão `app`), **Serviço**
(multi-seleção) e **Buscar texto** (regex, sem diferenciar maiúsculas).

Dá para editar na interface (`allowUiUpdates`), mas o arquivo é a fonte da verdade. Para manter
uma alteração, exporte o JSON (Share → Export) e sobrescreva `kizuna-overview.json`.

## 5. Consultas úteis (LogQL)

```logql
{compose_service="app"}                                   # tudo do app Next
{compose_service="app", stream="stderr"}                  # console.error / console.warn
{compose_service="app"} |= "[auth.login]"                 # login
{compose_service="app"} |= "[auth.forgot]"                # recuperar senha
{compose_service="app"} |= "email_failed"                 # falhas de SMTP
{compose_service="app"} |= "captcha_failed"               # captcha recusado
{compose_service="app"} |= "locked_out"                   # lockout por senha errada
{compose_service="postgrest"}                             # PostgREST
sum by (compose_service) (count_over_time({stream="stderr"}[5m]))   # volume de erros
```

Labels disponíveis: `container`, `compose_project`, `compose_service`, `stream`
(`stdout`/`stderr`) e `level` (só quando a linha é JSON com campo `level`).

## 6. Alertas

**Alerting → Contact points:** cadastre e-mail (usa o SMTP do Grafana, via envs `GF_SMTP_*`),
Telegram, Discord, Slack ou webhook. Depois, em **Alert rules → New alert rule**, use uma
consulta como condição. Exemplos:

| Alerta                  | Consulta                                                                   | Condição |
| ----------------------- | -------------------------------------------------------------------------- | -------- |
| SMTP falhando           | `sum(count_over_time({compose_service="app"} \|= "email_failed" [10m]))`   | `> 3`    |
| Pico de captcha         | `sum(count_over_time({compose_service="app"} \|= "captcha_failed" [5m]))`  | `> 20`   |
| Ataque de senha         | `sum(count_over_time({compose_service="app"} \|= "locked_out" [5m]))`      | `> 10`   |
| Erros do app            | `sum(count_over_time({compose_service="app", stream="stderr"} [5m]))`      | `> 50`   |

## 7. Ajustes e limites

* **Retenção:** `retention_period` em `loki-config.yml` (`720h` = 30 dias).
* **Ruído:** para não coletar Traefik ou Dokploy, adicione ao `discovery.relabel` uma regra
  com `action = "drop"`, por exemplo:
  `rule { source_labels = ["__meta_docker_container_name"] regex = "/dokploy-traefik.*" action = "drop" }`.
* **Vários servidores:** o Alloy só vê os containers do host onde roda. Em cada servidor extra,
  suba só o serviço `alloy` apontando `loki.write` para o Loki central, que nesse caso precisa
  de acesso protegido (rede privada ou VPN).
* **Driver de log:** o Alloy lê containers com o driver `json-file` ou `local`, que são o padrão
  do Docker e do Dokploy. Para confirmar, rode no servidor
  `docker info --format '{{.LoggingDriver}}'`.
* **Rotação no host:** o `json-file` não tem limite por padrão. Em `/etc/docker/daemon.json`:

  ```json
  { "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" }}
  ```

  Reinicie o Docker e faça redeploy dos serviços, porque a regra só vale para containers novos.
  O Loki já guarda a própria cópia.
* **Versões:** as imagens estão fixadas. Para atualizar, troque as tags e faça redeploy.

## Problemas comuns

| Sintoma                                   | Causa / correção                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| Deploy falha com `GRAFANA_ADMIN_PASSWORD` | Env não definida no Dokploy                                                      |
| `network kizuna_net not found`            | Suba antes o stack `postgres-postgrest`, ou crie com `docker network create kizuna_net` |
| Domínio dá 404 ou Bad Gateway             | Falta `dokploy-network` no serviço `grafana` (seção 3)                           |
| Explore sem nenhum log                    | Alloy sem acesso ao `docker.sock`. Veja `docker logs <alloy>`                    |
| Loki reclama de "too old"                 | Logs antigos rejeitados (`reject_old_samples_max_age`), o que é normal no primeiro start |
| Disco enchendo                            | Diminua `retention_period` e configure a rotação do `json-file`                  |
