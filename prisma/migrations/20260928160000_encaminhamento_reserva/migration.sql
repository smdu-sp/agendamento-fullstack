ALTER TABLE `agendamentos`
  ADD COLUMN `encaminhadoReservaEm` DATETIME(3) NULL,
  ADD COLUMN `motivoEncaminhamentoReserva` VARCHAR(255) NULL;

CREATE TABLE `eventos_agendamento` (
  `id` VARCHAR(191) NOT NULL,
  `agendamentoId` VARCHAR(191) NOT NULL,
  `atorId` VARCHAR(191) NULL,
  `tipo` VARCHAR(80) NOT NULL,
  `dados` JSON NULL,
  `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `eventos_agendamento_agendamentoId_criadoEm_idx`(`agendamentoId`, `criadoEm`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `eventos_agendamento` ADD CONSTRAINT `eventos_agendamento_agendamentoId_fkey` FOREIGN KEY (`agendamentoId`) REFERENCES `agendamentos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `eventos_agendamento` ADD CONSTRAINT `eventos_agendamento_atorId_fkey` FOREIGN KEY (`atorId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
