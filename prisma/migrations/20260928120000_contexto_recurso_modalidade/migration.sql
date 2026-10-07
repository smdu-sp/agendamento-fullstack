-- Campos opcionais para preservar o contexto de novos atendimentos sem alterar os legados.
ALTER TABLE `agendamentos`
    ADD COLUMN `modalidade` ENUM('PRESENCIAL', 'ONLINE') NULL,
    ADD COLUMN `origemAgendamento` ENUM('RECURSO', 'ARTHUR_SABOYA') NULL,
    ADD COLUMN `tipoRecurso` ENUM('DESPACHO', 'COMUNIQUE_SE') NULL,
    ADD COLUMN `ocorrenciaBiId` VARCHAR(64) NULL,
    ADD COLUMN `protocoloOrigem` VARCHAR(255) NULL,
    ADD COLUMN `sistemaOrigem` VARCHAR(255) NULL,
    ADD COLUMN `situacaoRecurso` VARCHAR(255) NULL,
    ADD COLUMN `unidadeOrigem` VARCHAR(255) NULL,
    ADD COLUMN `responsavelOriginal` VARCHAR(255) NULL,
    ADD COLUMN `responsavelOriginalRF` VARCHAR(64) NULL,
    ADD COLUMN `snapshotBiEm` DATETIME(3) NULL,
    ADD COLUMN `duvidaAtendimento` TEXT NULL,
    ADD COLUMN `localAtendimento` VARCHAR(255) NULL,
    ADD COLUMN `sala` VARCHAR(100) NULL,
    ADD COLUMN `orientacaoAcesso` TEXT NULL;

CREATE INDEX `agendamentos_ocorrenciaBiId_idx` ON `agendamentos`(`ocorrenciaBiId`);
