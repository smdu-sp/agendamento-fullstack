CREATE TABLE `agendas_tecnicos` (
    `id` VARCHAR(191) NOT NULL,
    `tecnicoId` VARCHAR(191) NOT NULL,
    `diaSemana` INTEGER NOT NULL,
    `horaInicio` VARCHAR(5) NOT NULL,
    `horaFim` VARCHAR(5) NOT NULL,
    `duracaoMinutos` INTEGER NOT NULL,
    `modalidade` ENUM('PRESENCIAL', 'ONLINE') NOT NULL,
    `vigenciaInicio` DATE NOT NULL,
    `vigenciaFim` DATE NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `agendas_tecnicos_tecnicoId_diaSemana_ativo_idx`(`tecnicoId`, `diaSemana`, `ativo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ausencias_tecnicos` (
    `id` VARCHAR(191) NOT NULL,
    `tecnicoId` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(80) NOT NULL,
    `dataHoraInicio` DATETIME(3) NOT NULL,
    `dataHoraFim` DATETIME(3) NOT NULL,
    `observacao` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `ausencias_tecnicos_tecnicoId_dataHoraInicio_dataHoraFim_idx`(`tecnicoId`, `dataHoraInicio`, `dataHoraFim`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `agendas_tecnicos` ADD CONSTRAINT `agendas_tecnicos_tecnicoId_fkey` FOREIGN KEY (`tecnicoId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ausencias_tecnicos` ADD CONSTRAINT `ausencias_tecnicos_tecnicoId_fkey` FOREIGN KEY (`tecnicoId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
