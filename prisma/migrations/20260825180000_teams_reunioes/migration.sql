-- CreateTable
CREATE TABLE `configuracoes_sistema` (
    `chave` VARCHAR(191) NOT NULL,
    `valor` TEXT NOT NULL,
    `atualizadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoPorId` VARCHAR(191) NULL,

    PRIMARY KEY (`chave`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `agendamentos`
    ADD COLUMN `teamsEventId` TEXT NULL,
    ADD COLUMN `teamsJoinUrl` TEXT NULL,
    ADD COLUMN `teamsMeetingId` TEXT NULL,
    ADD COLUMN `teamsOrganizerEmail` VARCHAR(255) NULL,
    ADD COLUMN `teamsUltimoErro` TEXT NULL,
    ADD COLUMN `motivoCancelamento` TEXT NULL,
    ADD COLUMN `canceladoEm` DATETIME(3) NULL,
    ADD COLUMN `canceladoPorId` VARCHAR(191) NULL,
    ADD COLUMN `presencaSincronizadaEm` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `presencas_reuniao` (
    `id` VARCHAR(191) NOT NULL,
    `agendamentoId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `role` VARCHAR(64) NULL,
    `durationSeconds` INTEGER NULL,
    `joinDateTime` DATETIME(3) NULL,
    `leaveDateTime` DATETIME(3) NULL,

    INDEX `presencas_reuniao_agendamentoId_idx`(`agendamentoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `configuracoes_sistema` ADD CONSTRAINT `configuracoes_sistema_atualizadoPorId_fkey` FOREIGN KEY (`atualizadoPorId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agendamentos` ADD CONSTRAINT `agendamentos_canceladoPorId_fkey` FOREIGN KEY (`canceladoPorId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `presencas_reuniao` ADD CONSTRAINT `presencas_reuniao_agendamentoId_fkey` FOREIGN KEY (`agendamentoId`) REFERENCES `agendamentos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
