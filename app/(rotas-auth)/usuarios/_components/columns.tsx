/** @format */

"use client";

import { IUsuario } from "@/types/usuario";
import { ColumnDef } from "@tanstack/react-table";
import ModalUpdateCreate from "./modal-update-create";
import ModalDelete from "./modal-delete";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<IUsuario>[] = [
  {
    accessorKey: "nome",
    header: "Nome",
  },
  {
    accessorKey: "login",
    header: "Usuário",
  },
  {
    accessorKey: "email",
    header: "E-mail",
  },
  {
    accessorKey: "coordenadoria",
    header: "Coordenadoria",
    cell: ({ row }) => {
      const coord = row.original.divisao?.coordenadoria;
      const texto =
        coord?.sigla?.trim() || coord?.nome?.trim() || null;
      return <span className="text-sm">{texto ?? "-"}</span>;
    },
  },
  {
    accessorKey: "divisao",
    header: "Divisão",
    cell: ({ row }) => {
      const div = row.original.divisao;
      const texto = div?.sigla?.trim() || div?.nome?.trim() || null;
      return <span className="text-sm">{texto ?? "-"}</span>;
    },
  },
  {
    accessorKey: "status",
    header: () => <p className="text-center">Status</p>,
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <div className="flex items-center justify-center">
          <Badge variant={`${status == false ? "destructive" : "default"}`}>
            {status ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "actions",
    header: () => <p className="text-center">Ações</p>,
    cell: ({ row }) => {
      return (
        <div className="flex gap-2 items-center justify-center" key={row.id}>
          <ModalUpdateCreate user={row.original} isUpdating={true} />
          <ModalDelete status={!row.original.status} id={row.original.id} />
        </div>
      );
    },
  },
];
