/** @format */

"use client";

import { Badge } from "@/components/ui/badge";
import { IMunicipe } from "@/types/municipe";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ModalEditar from "./modal-editar";
import ModalResetarSenha from "./modal-resetar-senha";
import ModalStatus from "./modal-status";

function formatarData(data: Date | null) {
  if (!data) return "-";
  return format(new Date(data), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export const columns: ColumnDef<IMunicipe>[] = [
  {
    accessorKey: "nome",
    header: "Nome",
  },
  {
    accessorKey: "email",
    header: "E-mail",
  },
  {
    accessorKey: "criadoEm",
    header: "Cadastro",
    cell: ({ row }) => (
      <span className="text-sm">{formatarData(row.original.criadoEm)}</span>
    ),
  },
  {
    accessorKey: "ultimoLogin",
    header: "Último acesso",
    cell: ({ row }) => (
      <span className="text-sm">{formatarData(row.original.ultimoLogin)}</span>
    ),
  },
  {
    accessorKey: "totalAgendamentos",
    header: () => <p className="text-center">Agendamentos</p>,
    cell: ({ row }) => (
      <p className="text-center text-sm">{row.original.totalAgendamentos}</p>
    ),
  },
  {
    accessorKey: "totalSolicitacoesPreProjeto",
    header: () => <p className="text-center">Pré-projetos</p>,
    cell: ({ row }) => (
      <p className="text-center text-sm">
        {row.original.totalSolicitacoesPreProjeto}
      </p>
    ),
  },
  {
    accessorKey: "status",
    header: () => <p className="text-center">Status</p>,
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <div className="flex items-center justify-center">
          <Badge variant={status ? "default" : "destructive"}>
            {status ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "actions",
    header: () => <p className="text-center">Ações</p>,
    cell: ({ row }) => (
      <div className="flex gap-2 items-center justify-center" key={row.id}>
        <ModalEditar municipe={row.original} />
        <ModalResetarSenha municipe={row.original} />
        <ModalStatus municipe={row.original} />
      </div>
    ),
  },
];
