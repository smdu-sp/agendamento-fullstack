# Documentação — Gerenciador de Agendamentos (SMUL)

Sistema de agendamento de atendimentos técnicos da Secretaria Municipal de Urbanismo e Licenciamento (SMUL), com área interna para servidores e portal público para munícipes.

## Como esta documentação está organizada

| Parte | Para quem | Conteúdo |
|---|---|---|
| [tecnica/](tecnica/) | Desenvolvedores, operação, arquitetura | Arquitetura, banco, segurança, regras de negócio, integrações, execução e implantação |
| [manual-usuario/](manual-usuario/) | Munícipes e servidores | Passo a passo das tarefas do dia a dia, por perfil |

### Documentação técnica

1. [Visão geral e arquitetura](tecnica/01-visao-geral-e-arquitetura.md)
2. [Estrutura de pastas](tecnica/02-estrutura-de-pastas.md)
3. [Configuração do ambiente](tecnica/03-configuracao-ambiente.md)
4. [Execução local](tecnica/04-execucao-local.md)
5. [Implantação](tecnica/05-implantacao.md)
6. [Banco de dados](tecnica/06-banco-de-dados.md)
7. [Autenticação e autorização](tecnica/07-autenticacao-e-autorizacao.md)
8. Regras de negócio
   - [Ciclo de vida do agendamento](tecnica/08-regras-de-negocio/ciclo-de-vida-agendamento.md)
   - [Portal de processos e BI](tecnica/08-regras-de-negocio/portal-processos-e-bi.md)
   - [Conferência CAP](tecnica/08-regras-de-negocio/conferencia-cap.md)
   - [Agenda dos técnicos, ausências e reserva](tecnica/08-regras-de-negocio/agenda-tecnicos-ausencias-reserva.md)
   - [Importação de planilhas](tecnica/08-regras-de-negocio/importacao-planilhas.md)
   - [Microsoft Teams e presença](tecnica/08-regras-de-negocio/teams-e-presenca.md)
   - [Arthur Saboya — pré-projetos](tecnica/08-regras-de-negocio/arthur-saboya-pre-projetos.md)
9. [APIs e integrações](tecnica/09-apis-e-integracoes.md)
10. [Testes e qualidade](tecnica/10-testes-e-qualidade.md)
11. [Pendências e riscos](tecnica/11-pendencias-e-riscos.md)
12. [Migração do backend NestJS](tecnica/12-migracao-nestjs.md)
- [Decisões de arquitetura (ADR)](tecnica/adr/)
- [Documentos históricos](tecnica/historico/README.md)

### Manual do usuário

- [Como usar este manual](manual-usuario/README.md)
- [Glossário](manual-usuario/glossario.md)

## Convenções

- **✅ Confirmado no código**: comportamento verificado na leitura do código-fonte; o arquivo de origem é citado.
- **❓ Requer confirmação**: informação que o código não comprova (decisão de negócio, ambiente de produção, regra provisória). Itens consolidados em [Pendências e riscos](tecnica/11-pendencias-e-riscos.md).
- Nenhum valor de variável de ambiente ou credencial é reproduzido nesta documentação.

Documentação gerada a partir do código em 07/10/2026 (branch `main`, incluindo alterações locais na tela de agenda dos técnicos).
