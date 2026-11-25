-- Conteúdos iniciais da Central de Ajuda
insert into public.help_items (id, user_id, category, thumb, title, summary, youtube_id, body, position) values
('final-3', null, 'siglas', '3', 'Final 3: ação ordinária (ON)', 'Dá direito a voto em assembleias. É o tipo mais comum entre as empresas listadas.', null, null, 0),
('final-4', null, 'siglas', '4', 'Final 4: ação preferencial (PN)', 'Tem prioridade no recebimento de dividendos, em geral sem direito a voto.', null, null, 1),
('final-5-6', null, 'siglas', '5/6', 'Finais 5 e 6: PNA e PNB', 'Preferenciais de classes A e B, com direitos definidos no estatuto da empresa.', null, null, 2),
('final-11', null, 'siglas', '11', 'Final 11: units, FIIs e ETFs', 'Três produtos diferentes usam o mesmo final. Veja como diferenciar um do outro.', null, '{"intro":"Um ticker terminado em 11 pode ser de três produtos diferentes: units, fundos imobiliários (FIIs) e ETFs. O número sozinho não diz qual deles é.","heading":"Como diferenciar","examples":[{"ticker":"KLBN11","text":"Unit: um pacote com ações ON e PN da mesma empresa, negociado como um único papel."},{"ticker":"MXRF11","text":"FII: cota de um fundo imobiliário, que costuma distribuir rendimentos todo mês."},{"ticker":"BOVA11","text":"ETF: fundo negociado em bolsa que replica um índice, no caso o Ibovespa."}],"note":"Na dúvida, confira o nome completo do ativo na B3 ou na sua corretora antes de comprar.","suffix":"11"}'::jsonb, 3),
('final-f', null, 'siglas', 'F', 'Final F: mercado fracionário', 'A letra F indica negociação em lotes menores que o lote padrão de 100.', null, null, 4),
('final-3f-4f', null, 'siglas', '3F·4F', 'Finais 3F e 4F', 'Versões fracionárias de ações ON e PN: mesmo papel, negociado em quantidades menores.', null, null, 5),
('final-34-35', null, 'siglas', '34/35', 'Finais 34 e 35: BDRs', 'Recibos de ações de empresas estrangeiras negociados na B3, como AAPL34.', null, null, 6),
('pl', null, 'indicadores', 'P/L', 'P/L: preço sobre lucro', 'Quantos anos de lucro atual seriam necessários para "pagar" o preço da ação.', null, null, 7),
('pvp', null, 'indicadores', 'P/VP', 'P/VP: preço sobre valor patrimonial', 'Compara o preço de mercado com o patrimônio contábil. Muito usado para FIIs e bancos.', null, null, 8),
('dy', null, 'indicadores', 'DY', 'Dividend Yield (DY)', 'Proventos pagos nos últimos 12 meses divididos pelo preço atual, em %.', null, null, 9),
('roe', null, 'indicadores', 'ROE', 'ROE: retorno sobre o patrimônio', 'Mede quanto lucro a empresa gera com o capital dos acionistas.', null, null, 10),
('liquidez', null, 'indicadores', 'LIQ', 'Liquidez diária', 'Volume negociado por dia. Baixa liquidez dificulta comprar e vender pelo preço justo.', null, null, 11),
('acao', null, 'tipos', 'AÇÃO', 'Ações', 'Pequenas partes de uma empresa listada em bolsa. Você vira sócio do negócio.', null, null, 12),
('fii', null, 'tipos', 'FII', 'Fundos imobiliários (FIIs)', 'Fundos que investem em imóveis ou títulos do setor e distribuem rendimentos mensais.', null, null, 13),
('etf', null, 'tipos', 'ETF', 'ETFs', 'Fundos negociados em bolsa que replicam um índice, como o Ibovespa.', null, null, 14),
('bdr', null, 'tipos', 'BDR', 'BDRs', 'Certificados que representam ações de empresas estrangeiras, negociados na B3.', null, null, 15),
('cripto', null, 'tipos', 'BTC', 'Criptomoedas', 'Ativos digitais descentralizados, com alta volatilidade e negociação 24 horas.', null, null, 16),
('ir-acoes', null, 'impostos', 'IR', 'IR sobre ações', 'Vendas de até R$ 20 mil por mês em ações são isentas no swing trade; acima disso, 15% sobre o lucro.', null, null, 17),
('ir-fiis', null, 'impostos', 'FII', 'IR sobre FIIs', 'Rendimentos mensais costumam ser isentos para pessoa física; o ganho na venda paga 20%.', null, null, 18),
('darf', null, 'impostos', 'DARF', 'Como emitir a DARF', 'O imposto sobre o lucro é pago até o último dia útil do mês seguinte à venda.', null, null, 19),
('ir-cripto', null, 'impostos', 'BTC', 'IR sobre criptomoedas', 'Regras de isenção e alíquotas para ganhos com cripto e como declarar.', null, null, 20)
on conflict (id) do nothing;
