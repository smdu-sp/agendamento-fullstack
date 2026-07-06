<p align="center">
  <a href="https://www.prefeitura.sp.gov.br/cidade/secretarias/licenciamento/" target="blank"><img src="https://www.prefeitura.sp.gov.br/cidade/secretarias/upload/chamadas/URBANISMO_E_LICENCIAMENTO_HORIZONTAL_FUNDO_CLARO_1665756993.png" width="200" alt="SMUL Logo" /></a>
</p>
<p align="center">Base de desenvolvimento Frontend - SMUL/ATIC</p>

## Tecnologias

<p align="left">
    <a href="https://nextjs.org/docs" target="_blank" title="Next.js" style="text-decoration: none; decoration: none;">
        <img src="https://github.com/tandpfun/skill-icons/raw/main/icons/NextJS-Dark.svg" alt="Next.js" width="40" height="40" style="border-radius: 50%;" />
    </a>
    <a href="" target="https://ui.shadcn.com/docs" title="Shadcn UI" style="text-decoration: none; decoration: none;">
        <img src="https://avatars.githubusercontent.com/u/139895814" alt="Shadcn UI" width="40" height="40" style="border-radius: 50%;" />
    </a>
    <a href="" target="https://authjs.dev/getting-started" title="Tailwind" style="text-decoration: none; decoration: none;">
        <img src="https://github.com/tandpfun/skill-icons/raw/main/icons/TailwindCSS-Dark.svg" alt="Tailwind" width="40" height="40" style="border-radius: 50%;" />
    </a>
    <a href="" target="https://tailwindcss.com/docs" title="Auth.js" style="text-decoration: none; decoration: none;">
        <img src="https://authjs.dev/img/etc/logo-sm.webp" alt="Auth.js" width="40" height="40" style="border-radius: 50%;" />
    </a>
</p>


## Instalação

```bash
npm install
# ou
yarn install
# ou
pnpm install
# ou
bun install
```

## Criando o arquivo .env

```bash
copy example.env .env
```

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie o código gerado para o campo AUTH_SECRET no arquivo .env

## Rodando a aplicação

Por padrão, a aplicação rodará na porta 3001.

```bash
# atualiza a cada mudança nos arquivos
npm run dev
# ou
yarn dev
# ou
pnpm dev
# ou
bun dev
```

```bash
# modo de desenvolvimento
npm run start
# ou
yarn start
# ou
pnpm start
# ou
bun start
```

Abra [http://localhost:3001](http://localhost:3001) com o navegador.