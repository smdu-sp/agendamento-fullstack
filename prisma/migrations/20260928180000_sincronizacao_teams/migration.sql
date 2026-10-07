ALTER TABLE `agendamentos`
  ADD COLUMN `teamsSyncPendente` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `teamsSyncVersao` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `teamsSyncTentativas` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `teamsSyncEmProcessamentoAte` DATETIME(3) NULL;

CREATE INDEX `agendamentos_teamsSyncPendente_teamsSyncEmProcessamentoAte_idx`
  ON `agendamentos`(`teamsSyncPendente`, `teamsSyncEmProcessamentoAte`);
