-- AlterTable
ALTER TABLE `agendamentos`
    ADD COLUMN `telefone` VARCHAR(32) NULL,
    ADD COLUMN `relacaoInteressado` ENUM('AUTOR_PROJETO', 'AUTORIZADO', 'PROPRIETARIO', 'RESPONSAVEL_TECNICO', 'TERCEIROS') NULL,
    ADD COLUMN `origemPortalProcesso` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `conferenciaCapStatus` ENUM('AGUARDANDO', 'ENCAMINHADO', 'NAO_ENCONTRADO') NULL,
    ADD COLUMN `unidadeDespachoBi` VARCHAR(255) NULL,
    ADD COLUMN `encontradoNoBi` BOOLEAN NULL,
    ADD COLUMN `biComuniqueSe` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `biIndeferido` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `confirmadoProcessoAusente` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `observacaoCap` TEXT NULL,
    ADD COLUMN `municipeContaId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `agendamentos_conferenciaCapStatus_idx` ON `agendamentos`(`conferenciaCapStatus`);

-- CreateIndex
CREATE INDEX `agendamentos_municipeContaId_idx` ON `agendamentos`(`municipeContaId`);

-- CreateIndex
CREATE INDEX `agendamentos_origemPortalProcesso_idx` ON `agendamentos`(`origemPortalProcesso`);

-- AddForeignKey
ALTER TABLE `agendamentos` ADD CONSTRAINT `agendamentos_municipeContaId_fkey` FOREIGN KEY (`municipeContaId`) REFERENCES `municipes_contas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
