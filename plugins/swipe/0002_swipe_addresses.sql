-- plugins/swipe/0002_swipe_addresses.sql
-- Antes recriava fn_swipe_deck / fn_swipe_liked com as colunas de endereço. As funções do swipe
-- saíram (ver 0003_swipe_drop_functions.sql): o deck usa a própria busca, que já traz
-- city / state / address_count. Mantido vazio para não quebrar a contagem de migrations.
SELECT 1;
