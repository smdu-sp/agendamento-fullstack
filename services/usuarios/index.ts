export {
    buscarTudo,
    buscarPorId,
    buscarNovo,
    listaCompleta,
    validaUsuario,
    buscarTecnicosPorCoordenadoria,
    buscarTecnicosPorDivisao,
    buscarTecnicosArthurSaboya
} from './query-functions';
export type { ITecnico } from './query-functions';

export {
    atualizar,
    criar,
    desativar,
    autorizar
} from './server-functions';