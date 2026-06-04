# Central de Crise: Herois de Plantao

Jogo web em React/Vite sobre uma central de resposta meta-humana em Nova Aurora.

## Como rodar no browser

No Windows, use o atalho:

```powershell
.\rodar-no-browser.cmd
```

Ou, pelo terminal:

```powershell
.\.tools\node\node.exe .\.tools\pnpm\package\bin\pnpm.cjs install
.\.tools\node\node.exe .\.tools\pnpm\package\bin\pnpm.cjs run dev
```

Depois abra:

```text
http://127.0.0.1:5197/
```

## Scripts uteis

```powershell
.\.tools\node\node.exe .\.tools\pnpm\package\bin\pnpm.cjs run build
.\.tools\node\node.exe .\.tools\pnpm\package\bin\pnpm.cjs run validate:narrative
```

## Observacao

As pastas `.tools`, `node_modules`, `dist` e logs locais ficam fora do Git.
