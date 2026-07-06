-- CreateTable
CREATE TABLE `usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `login` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(255) NULL,
    `permissao` ENUM('DEV', 'ADM', 'TEC', 'ARTHUR_SABOYA', 'USR', 'PONTO_FOCAL', 'COORDENADOR', 'PORTARIA', 'DIRETOR') NOT NULL DEFAULT 'PORTARIA',
    `status` BOOLEAN NOT NULL DEFAULT true,
    `avatar` TEXT NULL,
    `ultimoLogin` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `nomeSocial` VARCHAR(191) NULL,
    `divisaoId` VARCHAR(191) NULL,

    UNIQUE INDEX `usuarios_login_key`(`login`),
    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agendamentos` (
    `id` VARCHAR(191) NOT NULL,
    `municipe` VARCHAR(191) NULL,
    `cpf` VARCHAR(191) NULL,
    `processo` VARCHAR(191) NULL,
    `dataHora` DATETIME(3) NOT NULL,
    `dataFim` DATETIME(3) NULL,
    `importado` BOOLEAN NOT NULL DEFAULT false,
    `importadoOutlook` BOOLEAN NOT NULL DEFAULT false,
    `tecnicoResponsavelPlanilha` VARCHAR(255) NULL,
    `resumo` TEXT NULL,
    `tipoAgendamentoId` VARCHAR(191) NULL,
    `motivoNaoAtendimentoId` VARCHAR(191) NULL,
    `coordenadoriaId` VARCHAR(191) NULL,
    `divisaoId` VARCHAR(191) NULL,
    `tecnicoId` VARCHAR(191) NULL,
    `tecnicoRF` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `status` ENUM('SOLICITADO', 'AGENDADO', 'CANCELADO', 'CONCLUIDO', 'ATENDIDO', 'NAO_REALIZADO') NOT NULL DEFAULT 'SOLICITADO',
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tipos_agendamento` (
    `id` VARCHAR(191) NOT NULL,
    `texto` VARCHAR(191) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tipos_agendamento_texto_key`(`texto`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `motivos` (
    `id` VARCHAR(191) NOT NULL,
    `texto` VARCHAR(191) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `motivos_texto_key`(`texto`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coordenadorias` (
    `id` VARCHAR(191) NOT NULL,
    `sigla` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NULL,
    `email` VARCHAR(255) NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `coordenadorias_sigla_key`(`sigla`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `divisoes` (
    `id` VARCHAR(191) NOT NULL,
    `sigla` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `coordenadoriaId` VARCHAR(191) NULL,

    UNIQUE INDEX `divisoes_sigla_key`(`sigla`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `solicitacoes_pre_projeto_arthur_saboya` (
    `id` VARCHAR(191) NOT NULL,
    `protocolo` VARCHAR(191) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `formacaoValor` VARCHAR(191) NOT NULL,
    `formacaoOutro` VARCHAR(191) NULL,
    `formacaoTexto` VARCHAR(255) NOT NULL,
    `naturezaValor` VARCHAR(191) NOT NULL,
    `naturezaOutro` VARCHAR(191) NULL,
    `naturezaTexto` VARCHAR(500) NOT NULL,
    `duvida` TEXT NOT NULL,
    `status` ENUM('SOLICITADO', 'RESPONDIDO', 'AGUARDANDO_DATA', 'AGENDAMENTO_CRIADO') NOT NULL DEFAULT 'SOLICITADO',
    `avaliacaoNota` INTEGER NULL,
    `avaliacaoComentario` TEXT NULL,
    `avaliacaoEm` DATETIME(3) NULL,
    `dataAgendamento` DATETIME(3) NULL,
    `coordenadoriaId` VARCHAR(191) NULL,
    `divisaoId` VARCHAR(191) NULL,
    `municipeContaId` VARCHAR(191) NULL,
    `agendamentoId` VARCHAR(191) NULL,
    `tecnicoArthurId` VARCHAR(191) NULL,

    UNIQUE INDEX `solicitacoes_pre_projeto_arthur_saboya_protocolo_key`(`protocolo`),
    UNIQUE INDEX `solicitacoes_pre_projeto_arthur_saboya_agendamentoId_key`(`agendamentoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `solicitacoes_pre_projeto_arthur_saboya_mensagens` (
    `id` VARCHAR(191) NOT NULL,
    `solicitacaoId` VARCHAR(191) NOT NULL,
    `autor` ENUM('MUNICIPE', 'PONTO_FOCAL', 'SISTEMA') NOT NULL,
    `corpo` TEXT NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioId` VARCHAR(191) NULL,
    `municipeContaId` VARCHAR(191) NULL,

    INDEX `solicitacoes_pre_projeto_arthur_saboya_mensagens_solicitacao_idx`(`solicitacaoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `log_importacao_planilha` (
    `id` VARCHAR(191) NOT NULL,
    `dataHora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `total` INTEGER NOT NULL DEFAULT 0,
    `usuarioId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `log_importacao_outlook` (
    `id` VARCHAR(191) NOT NULL,
    `dataHora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `total` INTEGER NOT NULL DEFAULT 0,
    `usuarioId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `municipes_contas` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha_hash` VARCHAR(191) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `ultimo_login` DATETIME(3) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `municipes_contas_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `municipes_tokens_redefinicao_senha` (
    `id` VARCHAR(191) NOT NULL,
    `conta_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `expira_em` DATETIME(3) NOT NULL,
    `utilizado_em` DATETIME(3) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `municipes_tokens_redefinicao_senha_conta_id_token_hash_idx`(`conta_id`, `token_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_divisaoId_fkey` FOREIGN KEY (`divisaoId`) REFERENCES `divisoes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agendamentos` ADD CONSTRAINT `agendamentos_tipoAgendamentoId_fkey` FOREIGN KEY (`tipoAgendamentoId`) REFERENCES `tipos_agendamento`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agendamentos` ADD CONSTRAINT `agendamentos_motivoNaoAtendimentoId_fkey` FOREIGN KEY (`motivoNaoAtendimentoId`) REFERENCES `motivos`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agendamentos` ADD CONSTRAINT `agendamentos_coordenadoriaId_fkey` FOREIGN KEY (`coordenadoriaId`) REFERENCES `coordenadorias`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agendamentos` ADD CONSTRAINT `agendamentos_divisaoId_fkey` FOREIGN KEY (`divisaoId`) REFERENCES `divisoes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agendamentos` ADD CONSTRAINT `agendamentos_tecnicoId_fkey` FOREIGN KEY (`tecnicoId`) REFERENCES `usuarios`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `divisoes` ADD CONSTRAINT `divisoes_coordenadoriaId_fkey` FOREIGN KEY (`coordenadoriaId`) REFERENCES `coordenadorias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitacoes_pre_projeto_arthur_saboya` ADD CONSTRAINT `solicitacoes_pre_projeto_arthur_saboya_municipeContaId_fkey` FOREIGN KEY (`municipeContaId`) REFERENCES `municipes_contas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitacoes_pre_projeto_arthur_saboya` ADD CONSTRAINT `solicitacoes_pre_projeto_arthur_saboya_agendamentoId_fkey` FOREIGN KEY (`agendamentoId`) REFERENCES `agendamentos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitacoes_pre_projeto_arthur_saboya` ADD CONSTRAINT `solicitacoes_pre_projeto_arthur_saboya_tecnicoArthurId_fkey` FOREIGN KEY (`tecnicoArthurId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitacoes_pre_projeto_arthur_saboya` ADD CONSTRAINT `solicitacoes_pre_projeto_arthur_saboya_coordenadoriaId_fkey` FOREIGN KEY (`coordenadoriaId`) REFERENCES `coordenadorias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitacoes_pre_projeto_arthur_saboya` ADD CONSTRAINT `solicitacoes_pre_projeto_arthur_saboya_divisaoId_fkey` FOREIGN KEY (`divisaoId`) REFERENCES `divisoes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitacoes_pre_projeto_arthur_saboya_mensagens` ADD CONSTRAINT `solicitacoes_pre_projeto_arthur_saboya_mensagens_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitacoes_pre_projeto_arthur_saboya_mensagens` ADD CONSTRAINT `solicitacoes_pre_projeto_arthur_saboya_mensagens_municipeCo_fkey` FOREIGN KEY (`municipeContaId`) REFERENCES `municipes_contas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitacoes_pre_projeto_arthur_saboya_mensagens` ADD CONSTRAINT `solicitacoes_pre_projeto_arthur_saboya_mensagens_solicitaca_fkey` FOREIGN KEY (`solicitacaoId`) REFERENCES `solicitacoes_pre_projeto_arthur_saboya`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `log_importacao_planilha` ADD CONSTRAINT `log_importacao_planilha_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `log_importacao_outlook` ADD CONSTRAINT `log_importacao_outlook_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `municipes_tokens_redefinicao_senha` ADD CONSTRAINT `municipes_tokens_redefinicao_senha_conta_id_fkey` FOREIGN KEY (`conta_id`) REFERENCES `municipes_contas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

