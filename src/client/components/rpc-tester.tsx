'use client';

import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { AlertTriangle, CheckCircle2, FlaskConical, Play, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { Button, buttonVariants } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

type RpcResponse = {
  ok: boolean;
  status: number;
  data: unknown;
};

const initialValues = {
  schema: 'public',
  functionName: '',
  params: '{}',
};

const validationSchema = Yup.object({
  schema: Yup.string().trim().required('Informe o schema.'),
  functionName: Yup.string()
    .trim()
    .required('Informe o nome da funcao.')
    .matches(/^[a-zA-Z0-9_]+$/, 'Use apenas letras, numeros e underscore.'),
  params: Yup.string()
    .required('Informe os parametros em JSON.')
    .test('is-json', 'JSON invalido.', (value) => {
      if (!value) return false;
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }),
});

export type RpcTesterProps = {
  /** Endpoint que recebe { schema, functionName, params } via POST e repassa pro PostgREST RPC. */
  endpoint?: string;
  /** Rota pra onde o link "Voltar" aponta. Omitir esconde o link. */
  backHref?: string;
  backLabel?: string;
  title?: string;
  description?: string;
  eyebrow?: string;
};

/**
 * Formulário genérico de teste de função RPC contra um endpoint PostgREST — schema, nome da
 * função e parâmetros em JSON, mostrando status HTTP e payload de resposta. Sem nenhuma
 * taxonomia/regra de negócio: qualquer projeto que exponha `pgrstRpc` atrás de uma rota
 * `POST` pode usar como está.
 */
export function RpcTester({
  endpoint = '/api/postgrest/rpc',
  backHref,
  backLabel = 'Voltar',
  title = 'Teste de funcoes RPC',
  description = 'Execute funcoes do banco pelo PostgREST com o mesmo token da sua sessao atual.',
  eyebrow = 'Ferramentas',
}: RpcTesterProps = {}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [result, setResult] = useState<RpcResponse | null>(null);

  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit: async (values) => {
      setSubmitting(true);
      setError('');
      setSuccess('');

      try {
        const parsedParams = JSON.parse(values.params);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            schema: values.schema.trim(),
            functionName: values.functionName.trim(),
            params: parsedParams,
          }),
        });

        const data = (await response
          .json()
          .catch(() => ({ message: 'Resposta sem JSON.' }))) as unknown;
        const payload = {
          ok: response.ok,
          status: response.status,
          data,
        };

        setResult(payload);

        if (!response.ok) {
          setError('Falha ao executar funcao no PostgREST.');
          return;
        }

        setSuccess('Funcao executada com sucesso.');
      } catch {
        setError('Nao foi possivel processar os dados da requisicao.');
      } finally {
        setSubmitting(false);
      }
    },
  });

  function resetForm() {
    formik.resetForm({ values: initialValues });
    formik.setTouched({});
    formik.setErrors({});
    setError('');
    setSuccess('');
    setResult(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>

        {backHref ? (
          <div className="flex gap-2">
            <Link href={backHref} className={buttonVariants({ variant: 'outline' })}>
              {backLabel}
            </Link>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{success}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Executar funcao</CardTitle>
                <CardDescription>Informe schema, nome da funcao e parametros JSON.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={formik.handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rpc-schema">Schema</Label>
                <Input
                  id="rpc-schema"
                  name="schema"
                  value={formik.values.schema}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="public"
                />
                {formik.touched.schema && formik.errors.schema ? (
                  <p className="text-xs text-red-600 dark:text-red-300">{formik.errors.schema}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rpc-function">Funcao</Label>
                <Input
                  id="rpc-function"
                  name="functionName"
                  value={formik.values.functionName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="fun_nome_da_funcao"
                />
                {formik.touched.functionName && formik.errors.functionName ? (
                  <p className="text-xs text-red-600 dark:text-red-300">
                    {formik.errors.functionName}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rpc-params">Parametros (JSON)</Label>
                <textarea
                  id="rpc-params"
                  name="params"
                  value={formik.values.params}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  spellCheck={false}
                  placeholder='{"id": 1}'
                />
                {formik.touched.params && formik.errors.params ? (
                  <p className="text-xs text-red-600 dark:text-red-300">{formik.errors.params}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" className="sm:flex-1" disabled={submitting}>
                  <Play className="h-4 w-4" />
                  {submitting ? 'Executando...' : 'Executar'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
                  <RotateCcw className="h-4 w-4" />
                  Limpar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
            <CardDescription>
              Status HTTP e payload retornado pela funcao via PostgREST.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Status: <span className="font-semibold text-foreground">{result.status}</span>
                </p>
                <pre className="max-h-[420px] overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs leading-relaxed">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Execute uma funcao para visualizar o retorno aqui.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
