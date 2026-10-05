# Contrato de API — endpoints do backend

Este documento é o contrato de referência entre o frontend e o backend. Foi escrito durante a
reconstrução visual do frontend a partir do mock `KAMBA 1_0 Demo 3Empresas.html`, para cobrir
funcionalidades que o mock demonstra (com dados estáticos de exemplo) e que precisavam de existir
como sistema real com persistência.

> **Estado (2026-08-13):** as secções 1 e 2 estão **implementadas e verificadas** no backend
> (`app/api/routes/leave.py` e `app/api/routes/collaborators.py`, respetivamente). Os contratos
> abaixo mantêm-se como referência do formato esperado pelo frontend. Resta apenas a secção 3
> (gap de abas, sem ação) e a vista de calendário do mapa anual (secção 1.8) que o frontend ainda
> não consome.

Regra seguida em todo o frontend: nenhum destes endpoints foi simulado com dados inventados.
Cada ecrã que depende de um endpoint trata a falha de rede (404/não implementado) como um estado
de erro/vazio normal — mostra uma mensagem clara e não bloqueia o resto da página.

Convenções usadas nas tabelas: `obrigatório` = campo tem de vir preenchido; tipos `date` usam
`YYYY-MM-DD`. Todos os endpoints exigem o cabeçalho `Authorization: Bearer <token>` já enviado
automaticamente pelo interceptor em `src/lib/api.ts` — não repetido em cada endpoint abaixo.

---

## 1. Módulo "Férias & Ausências" — ✅ implementado

Ficheiro backend: `app/api/routes/leave.py`. Ficheiro frontend: `src/pages/Ausencias.tsx`, rota
`/ausencias`. Cobre o fluxo do mock: pedido do colaborador → aprovação do director → averbamento
pelo Capital Humano no mapa oficial, mais o registo directo de licença de maternidade pelo CH.

### 1.1 `GET /leave/me/balance`
Saldo de férias do utilizador autenticado (equivalente a `saldoFerias()` no mock, 22 dias/ano).

**Quem chama:** Colaborador (também aplicável a Director/CH ao consultarem o próprio saldo).

**Resposta 200:**
```json
{
  "direito": 22,
  "gozados": 8,
  "marcados": 5,
  "disponiveis": 9
}
```
Todos os campos são `integer`, em dias.

### 1.2 `GET /leave/requests`
Lista de pedidos de férias/faltas/maternidade. O backend deve filtrar pelo perfil de quem
consulta: `colaborador` → só os seus próprios pedidos; `director` → os pedidos da sua equipa;
`capital_humano`/`administracao` → todos os pedidos da empresa.

**Resposta 200:** array de:
```json
{
  "id": 101,
  "collaborator_id": 42,
  "collaborator_name": "Ana Domingos",
  "type": "ferias",
  "start_date": "2026-08-18",
  "end_date": "2026-09-05",
  "days": 14,
  "reason": "Gozo do período principal de férias de 2026.",
  "status": "pendente_dir",
  "document_name": null
}
```
| Campo | Tipo | Notas |
|---|---|---|
| `type` | `"ferias" \| "falta" \| "maternidade"` | |
| `status` | `"pendente_dir" \| "pendente_ch" \| "aprovada" \| "justificada" \| "recusada"` | ver máquina de estados abaixo |
| `document_name` | `string \| null` | nome do ficheiro anexado (secção 1.3), `null` se não houver |

**Máquina de estados** (replica `w().absReq` do mock):
- Férias: `pendente_dir → aprovada` (ou `→ recusada`, com `rejection_reason` guardado).
- Falta justificada com documento anexado: entra directamente como `justificada` (sem passar por aprovação do director), à semelhança do mock.
- Maternidade: criada já como `aprovada` (registo administrativo directo pelo CH, secção 1.6).

### 1.3 `POST /leave/requests`
Cria um novo pedido. **Enviado como `multipart/form-data`** (não JSON) para suportar o anexo
opcional de documento comprovativo — campo introduzido porque o formulário de "falta
justificada" precisa de comprovativo (ex.: atestado médico) e o mock não tinha um input real
para isto (os dados de exemplo já vinham com o documento pré-preenchido).

**Quem chama:** Colaborador.

| Campo (form-data) | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `tipo` | `"ferias" \| "falta"` | sim | maternidade não é auto-declarável, ver 1.6 |
| `inicio` | `date` | sim | |
| `fim` | `date` | sim | |
| `motivo` | `string` | sim | |
| `documento` | `file` | não | obrigatório na prática para `falta` ser aceite como `justificada` automaticamente; opcional para `ferias` |

**Resposta 201:** o pedido criado, no formato da secção 1.2.

### 1.4 `POST /leave/requests/{id}/approve`
Aprova um pedido de férias pendente da equipa. **Quem chama:** Director. Sem corpo. Transição:
`pendente_dir → aprovada`.

### 1.5 `POST /leave/requests/{id}/reject`
Rejeita um pedido pendente da equipa, com motivo obrigatório (campo introduzido porque o mock
não tinha um input de motivo de rejeição — a decisão do director tem de ficar fundamentada).

**Quem chama:** Director.
```json
{ "motivo": "Período coincide com o pico de fecho de contas; propor nova data em Setembro." }
```
`motivo`: `string`, obrigatório, mínimo 3 caracteres (validado também no frontend). Transição:
`pendente_dir → recusada`.

### 1.6 `POST /leave/maternity`
Regista uma licença de maternidade directamente (o mock trata isto como um registo
administrativo do CH, não um pedido do colaborador — 90 dias, art. 253.º da LGT). **Enviado como
`multipart/form-data`**, pelo mesmo motivo da secção 1.3: o mock já tinha o campo `doc` no
registo de exemplo ("Atestado médico + declaração de nascimento") mas nenhum input real para o
preencher.

**Quem chama:** Capital Humano / Administração.

| Campo (form-data) | Tipo | Obrigatório |
|---|---|---|
| `collaborator_id` | `integer` | sim |
| `inicio` | `date` | sim |
| `parto_multiplo` | `boolean` | não (`false` por omissão) |
| `fim` | `date` | não — calculado a partir de `inicio` quando omitido |
| `documento` | `file` | recomendado (atestado médico + declaração de nascimento) |
| `motivo` | `string` | não — texto legal por omissão |

Quando `fim` é omitido o fim é calculado a partir de `inicio`: **90 dias** (art. 253.º da LGT) ou
**118 dias** quando `parto_multiplo` é verdadeiro (90 + 4 semanas, parto múltiplo). Enviar `fim`
sobrepõe-se a esse cálculo, para casos excepcionais. O `motivo` por omissão é
`Licença de maternidade — 90 dias (art. 253.º LGT), remunerada.`
(ou `parto múltiplo (90+28 dias)`).

**Resposta 201:** o pedido criado com `type: "maternidade"`, `status: "aprovada"`, `averbado: false`.

### 1.6b `GET /leave/maternity/candidates`
Colaboradoras a quem se pode registar a licença. **Quem chama:** Capital Humano / Administração.
Filtra pelo sexo da ficha (`gender == feminino`); se a empresa ainda não tiver o sexo preenchido em
nenhuma ficha devolve todo o efectivo activo em vez de uma lista vazia, para o registo nunca ficar
bloqueado por falta de um dado de ficha.

```json
[{ "id": 42, "full_name": "Esperança Domingos", "department": "DCO — Vendas", "admission_date": "2019-01-15" }]
```

### 1.7 `POST /leave/requests/{id}/register`
Averba no mapa oficial um pedido já aprovado/justificado. **Quem chama:** Capital Humano /
Administração. Sem corpo. Transição: `aprovada`/`justificada` → mantém-se `aprovada`/`justificada`,
mas passa a contar como averbado no mapa anual (`averbado: true`) — o frontend só precisa que o
pedido deixe de aparecer na lista "a averbar" depois desta chamada.

### 1.8 `GET /leave/map?ano=`
Mapa anual de férias. **Quem chama:** Capital Humano / Administração (consolidado de toda a
empresa, `scope: "empresa"`) e Director (apenas a sua Direcção, `scope: "departamento"`). Devolve,
por colaborador, o direito a férias lido da data de admissão e o consumo (`direito`, `gozados`,
`marcados`, `em_urso`, `disponiveis`, `pode_pedir`) com a lista de `ferias` e `ausencias`.

### 1.8b `GET /leave/map/estado?ano=`
Estado do mapa anual do ano (art. 209.º da LGT). **Quem chama:** Capital Humano e Director (ambos
veem o mesmo estado — só o CH o elabora).

```json
{ "ano": 2026, "elaborado": true, "elaborado_em": "2026-01-15T09:12:44", "elaborado_por": "Afonso Rogerio" }
```

### 1.8c `POST /leave/map/elaborar?ano=`
O Capital Humano elabora a base do mapa de férias do ano (art. 209.º da LGT). Idempotente: voltar
aElaborar apenas actualiza a marca e o registo de auditoria (`ausencia.mapa_elaborado`) e notifica a
Administração. **Resposta:** o mesmo objecto de 1.8b.

---

## 2. Documentos do colaborador — upload de ficheiros — ✅ implementado

Ficheiro backend: `app/api/routes/collaborators.py`. Ficheiro frontend: `src/pages/Colaboradores.tsx`,
modal "Cadastrar colaborador" (secção "3. Documentos do colaborador"). O cadastro completo de
colaborador permite anexar documentos (BI, contrato assinado, certificados de habilitações) — isto
não existe no mock (que só demonstra uma biblioteca de documentos de **texto integral**, sem upload
de ficheiros).

### 2.1 `POST /collaborators/{id}/documents`
**Enviado como `multipart/form-data`. Quem chama:** Capital Humano.

| Campo (form-data) | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `file` | `file` | sim | PDF ou imagem, tamanho máximo a definir pelo backend |
| `doc_type` | `"bi" \| "contrato_assinado" \| "certificado_habilitacoes" \| "outro"` | sim | |

**Resposta 201:**
```json
{ "id": 501, "filename": "bi_ana_domingos.pdf", "doc_type": "bi", "uploaded_at": "2026-08-12T10:30:00Z" }
```

### 2.2 `GET /collaborators/{id}/documents`
Lista os documentos já anexados a um colaborador. **Quem chama:** Capital Humano. Resposta:
array no formato da secção 2.1. Ainda não consumido no frontend — reservado para mostrar os
documentos já enviados ao reabrir a ficha de um colaborador existente (hoje o upload só é
oferecido no momento do cadastro inicial).

### 2.3 `DELETE /collaborators/{id}/documents/{docId}`
Remove um documento anexado. **Quem chama:** Capital Humano. Ainda não consumido no frontend,
incluído para completar o CRUD.

O armazenamento é feito via Cloudinary (`app/services/cloudinary_upload.py`), com o registo
(nome, tipo, URL, data, colaborador) na tabela `collaborator_documents`.

---

## 3. Gap identificado (sem ação): abas "Documentos" vs "Políticas" do Portal

> Estado (2026-08-13): continua sem ação — é uma decisão de produto, não um endpoint em falta.

O mock separa `docs` (documentos do vínculo) de `politicas` (políticas gerais) como duas abas
distintas no Portal do Colaborador. O endpoint atual `/documents` devolve um único `doc_type`
(`contrato`, `regulamento_interno`, `codigo_etica`, `politica_assiduidade`,
`politica_remuneracao`, `regulamento_avaliacao`, `outro`) sem um campo que distinga claramente
"documento do vínculo" de "política geral" — a maioria dos tipos existentes já são políticas
gerais, pelo que dividir os dados actuais em duas abas seria uma separação arbitrária, não
suportada pelos dados. Por isso o Portal mantém uma única aba "Documentos".

**Se o backend vier a resolver este gap**, o contrato mínimo seria acrescentar um campo ao
`/documents` existente:
```json
{ "scope": "pessoal" | "politica_geral" }
```
com o frontend a filtrar client-side por este campo — sem necessidade de novos endpoints.
