import 'server-only';

import * as XLSX from 'xlsx';
import { StatusAgendamento } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
	buscarOuCriarTipoPorTexto,
	buscarOuCriarTecnicoPorRF,
	buscarCoordenadoriaPorSigla,
	buscarOuCriarCoordenadoriaPorSiglaImport,
	calcularDataFim,
	divisaoIdDoTecnico,
	instanteCivilSaoPauloSemDeslocamento,
	padronizarNome,
	registrarImportacaoPlanilha,
	registrarImportacaoOutlook,
} from '@/lib/agendamentos-core';
import { agendarReunioesEmLote } from '@/lib/agendamentos-teams';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type ResultadoImportacao = {
	importados: number;
	erros: number;
	duplicados: number;
	reunioesAgendadas?: number;
	reunioesFalhas?: number;
};

// ===================================================================================
// PLANILHA PADRÃO (SMUL)
// ===================================================================================

const CABECALHOS_ESPERADOS_PLANILHA = [
	'Nro. Processo',
	'Nro. Protocolo',
	'CPF',
	'Requerente',
	'E-mail Munícipe',
	'Tipo Agendamento',
	'Local de Atendimento',
	'RF Técnico',
	'Técnico',
	'E-mail Técnico',
	'Agendado para',
];

/**
 * Port da parte de leitura/detecção de cabeçalho do controller (importarPlanilha).
 * Detecta a linha de cabeçalho (padrão: linha 9 / índice 8) e converte em objetos.
 */
function parsePlanilhaXlsx(buffer: Buffer): any[] {
	const workbook = XLSX.read(buffer, { type: 'buffer' });
	if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
		throw new Error('Planilha vazia ou inválida');
	}
	const worksheet = workbook.Sheets[workbook.SheetNames[0]];
	if (!worksheet) throw new Error('Não foi possível ler a planilha');

	const linhasTeste = XLSX.utils.sheet_to_json(worksheet, {
		range: 'A1:Q20',
		header: 1,
		defval: null,
	}) as any[][];

	let linhaCabecalho = 8; // Padrão: linha 9 (índice 8)
	for (let i = 0; i < linhasTeste.length; i++) {
		const linha = linhasTeste[i] as any[];
		if (!linha || linha.length === 0) continue;
		const valoresNaoVazios = linha.filter((c) => c && String(c).trim() !== '');
		if (valoresNaoVazios.length === 0) continue;

		const linhaStr = linha
			.map((c) => String(c || '').trim())
			.join('|')
			.toLowerCase();

		const matchesExatos = CABECALHOS_ESPERADOS_PLANILHA.filter((cab) =>
			linha.some((c) => {
				const celula = String(c || '').trim();
				return celula === cab || celula.toLowerCase() === cab.toLowerCase();
			}),
		);
		const matchesParciais = CABECALHOS_ESPERADOS_PLANILHA.filter((cab) => {
			const palavrasCab = cab.toLowerCase().split(/\s+/);
			return palavrasCab.some((palavra) => linhaStr.includes(palavra) && palavra.length >= 3);
		});
		const matches = matchesExatos.length > 0 ? matchesExatos : matchesParciais;
		if (matches.length >= 4) {
			linhaCabecalho = i;
			break;
		}
	}

	const linhaInicio = linhaCabecalho + 1;
	const linhaCabecalhoArray = (linhasTeste[linhaCabecalho] as any[]) ?? [];
	const nomesColunas = linhaCabecalhoArray.map((c) => String(c || '').trim());

	let dadosArray = XLSX.utils.sheet_to_json(worksheet, {
		range: `A${linhaInicio}:Z1048576`,
		header: 1,
		defval: null,
		raw: false,
	}) as any[][];

	if (!dadosArray || dadosArray.length === 0) {
		dadosArray = XLSX.utils.sheet_to_json(worksheet, {
			header: 1,
			defval: null,
			raw: false,
		}) as any[][];
		if (dadosArray && dadosArray.length > linhaCabecalho) {
			dadosArray = dadosArray.slice(linhaCabecalho);
		}
	}

	let dados: any[] = [];
	if (dadosArray && dadosArray.length > 0) {
		const cabecalhoLinha = dadosArray[0] as any[];
		const usarCabecalhoDetectado =
			!cabecalhoLinha || !cabecalhoLinha.some((c) => nomesColunas.includes(String(c || '').trim()));
		const nomesColunasFinais = usarCabecalhoDetectado
			? nomesColunas
			: cabecalhoLinha.map((c) => String(c || '').trim());

		for (let i = 1; i < dadosArray.length; i++) {
			const linha = dadosArray[i] as any[];
			if (!linha || linha.length === 0) continue;
			const objeto: any = {};
			nomesColunasFinais.forEach((nome, index) => {
				if (nome && nome.trim() !== '') {
					objeto[nome] = linha[index] !== undefined ? linha[index] : null;
				}
			});
			if (Object.values(objeto).some((v) => v !== null && v !== undefined && String(v).trim() !== '')) {
				dados.push(objeto);
			}
		}
	}

	// Remove a primeira linha apenas se ela for exatamente o cabeçalho.
	if (dados && dados.length > 0 && !Array.isArray(dados[0])) {
		const valoresPrimeiraLinha = Object.values(dados[0]).map((v) =>
			String(v || '').trim().toLowerCase(),
		);
		const cabecalhosEsperadosLower = CABECALHOS_ESPERADOS_PLANILHA.map((c) => c.trim().toLowerCase());
		const valoresNaoVazios = valoresPrimeiraLinha.filter((v) => v !== '');
		if (valoresNaoVazios.length > 0) {
			const todosSaoCabecalhos = valoresNaoVazios.every((valor) =>
				cabecalhosEsperadosLower.some((cab) => valor === cab || valor.includes(cab)),
			);
			if (todosSaoCabecalhos && valoresNaoVazios.length >= 3) {
				dados = dados.slice(1);
			}
		}
	}

	return dados;
}

/** Port de AgendamentosService.importarPlanilha (processamento das linhas). */
async function processarImportacaoPlanilha(
	dadosPlanilha: any[],
	coordenadoriaId: string | undefined,
	usuarioId: string | undefined,
): Promise<ResultadoImportacao> {
	let importados = 0;
	let erros = 0;
	let duplicados = 0;
	const idsParaAgendar: string[] = [];

	if (!dadosPlanilha || !Array.isArray(dadosPlanilha)) {
		throw new Error('Dados da planilha inválidos');
	}

	const chavesIgnorar = ['SMUL - SECRETARIA MUNICIPAL DE URBANISMO E LICENCIAMENTO'];
	const valoresIgnorar = ['Sistema de Agendamento Eletrônico', 'Relatório de Agendamentos'];

	for (let index = 0; index < dadosPlanilha.length; index++) {
		const linha = dadosPlanilha[index];
		if (!linha || Object.keys(linha).length === 0) continue;

		const temValores = Object.entries(linha).some(([chave, valor]) => {
			if (chavesIgnorar.includes(chave)) return false;
			if (valor === null || valor === undefined || valor === '') return false;
			if (typeof valor === 'string' && valoresIgnorar.includes(valor.trim())) return false;
			return true;
		});
		if (!temValores) continue;

		try {
			const buscarValor = (obj: any, ...chaves: string[]): any => {
				for (const chave of chaves) {
					if (obj[chave] !== undefined && obj[chave] !== null && obj[chave] !== '') return obj[chave];
				}
				return null;
			};
			const buscarPorPalavraChave = (obj: any, palavrasChave: string[]): any => {
				for (const key of Object.keys(obj)) {
					const keyLower = key.toLowerCase().trim();
					for (const palavra of palavrasChave) {
						const palavraLower = palavra.toLowerCase().trim();
						if (keyLower.includes(palavraLower) || palavraLower.includes(keyLower)) {
							const valor = obj[key];
							if (valor !== undefined && valor !== null && valor !== '') return valor;
						}
					}
				}
				return null;
			};

			const temCabecalhosVazios = Object.keys(linha).some((k) => k.startsWith('__EMPTY'));

			let processo: any,
				cpf: any,
				municipe: any,
				tipoAgendamento: any,
				coordenadoriaSigla: any,
				tecnicoNome: any,
				tecnicoRF: any,
				email: any,
				emailTecnico: any,
				dataHora: any;

			if (temCabecalhosVazios) {
				processo = linha['__EMPTY'] || null;
				cpf = linha['__EMPTY_3'] || null;
				municipe = linha['__EMPTY_7'] || null;
				email = linha['__EMPTY_8'] || null;
				tipoAgendamento = linha['__EMPTY_9'] || null;
				coordenadoriaSigla = linha['__EMPTY_10'] || null;
				tecnicoRF = linha['__EMPTY_11'] || null;
				tecnicoNome = linha['__EMPTY_12'] || null;
				emailTecnico = linha['__EMPTY_13'] || null;
				dataHora = linha['__EMPTY_16'] || null;

				if (emailTecnico) {
					const emailTecStr = String(emailTecnico).trim();
					emailTecnico = !emailTecStr.includes('@') || !emailTecStr.includes('.') ? null : emailTecStr;
				}
				if (tecnicoRF) {
					const rfStr = String(tecnicoRF).trim();
					if (
						/\d{2}\/\d{2}\/\d{4}/.test(rfStr) ||
						rfStr.includes(':') ||
						tecnicoRF instanceof Date ||
						rfStr === coordenadoriaSigla
					) {
						tecnicoRF = null;
					}
				}
				if (email) {
					const emailStr = String(email).trim();
					if (!emailStr.includes('@') || !emailStr.includes('.')) email = null;
				}
			} else {
				processo =
					buscarValor(linha, 'Nro. Processo', 'Nro Processo', 'Número do Processo', 'número do processo', 'Processo', 'processo', 'PROCESSO') ||
					buscarPorPalavraChave(linha, ['processo', 'nro', 'número']);
				cpf = buscarValor(linha, 'CPF', 'cpf', 'Cpf') || buscarPorPalavraChave(linha, ['cpf']);
				municipe =
					buscarValor(linha, 'Requerente', 'requerente', 'REQUERENTE') ||
					buscarPorPalavraChave(linha, ['requerente', 'munícipe', 'municipe']);
				email =
					buscarValor(linha, 'E-mail Munícipe', 'E-mail munícipe', 'e-mail munícipe', 'E-mail', 'E-Mail', 'email', 'Email', 'EMAIL') ||
					buscarPorPalavraChave(linha, ['email', 'e-mail', 'munícipe']);
				tipoAgendamento =
					buscarValor(linha, 'Tipo Agendamento', 'Tipo de Agendamento', 'tipo agendamento', 'tipo de agendamento', 'Tipo', 'tipo') ||
					buscarPorPalavraChave(linha, ['tipo', 'agendamento']);
				coordenadoriaSigla =
					buscarValor(linha, 'Local de Atendimento', 'local de atendimento', 'Coordenadoria', 'coordenadoria', 'COORDENADORIA') ||
					buscarPorPalavraChave(linha, ['coordenadoria', 'local', 'atendimento']);
				tecnicoRF =
					buscarValor(linha, 'RF Técnico', 'RF técnico', 'rf técnico', 'RF', 'rf', 'Rf', 'RF do técnico', 'rf do técnico') ||
					buscarPorPalavraChave(linha, ['rf', 'técnico']);
				tecnicoNome =
					buscarValor(linha, 'Técnico', 'técnico', 'TECNICO', 'Nome do técnico', 'nome do técnico') ||
					buscarPorPalavraChave(linha, ['técnico', 'tecnico', 'nome']);
				emailTecnico =
					buscarValor(linha, 'E-mail Técnico', 'E-mail técnico', 'e-mail técnico', 'Email Técnico', 'email técnico', 'E-mail do Técnico', 'e-mail do técnico') ||
					null;
				if (emailTecnico) {
					const emailTecStr = String(emailTecnico).trim();
					emailTecnico = !emailTecStr.includes('@') || !emailTecStr.includes('.') ? null : emailTecStr;
				}
				dataHora =
					buscarValor(linha, 'Agendado para', 'agendado para', 'Agendado Para', 'Data e Hora', 'data e hora', 'Data/Hora', 'data/hora') ||
					buscarPorPalavraChave(linha, ['agendado', 'data', 'hora', 'para']);
				if (!dataHora) {
					for (const key of Object.keys(linha)) {
						const value = linha[key];
						const keyLower = key.toLowerCase();
						if (
							value &&
							(keyLower.includes('data') || keyLower.includes('hora') || keyLower.includes('agendado') || keyLower.includes('para'))
						) {
							dataHora = value;
							break;
						}
					}
				}
			}

			processo = processo ? String(processo).trim() : null;
			cpf = cpf ? String(cpf).trim() : null;
			municipe = municipe ? String(municipe).trim() : null;
			municipe = padronizarNome(municipe);
			tipoAgendamento = tipoAgendamento ? String(tipoAgendamento).trim() : null;
			coordenadoriaSigla = coordenadoriaSigla ? String(coordenadoriaSigla).trim() : null;
			tecnicoNome = tecnicoNome ? String(tecnicoNome).trim() : null;
			tecnicoRF = tecnicoRF ? String(tecnicoRF).trim() : null;
			email = email ? String(email).trim().toLowerCase() : null;
			const dataHoraOriginal = dataHora;
			dataHora = dataHora ? String(dataHora).trim() : null;

			const temDadosValidos = processo || cpf || municipe;

			if (!dataHora || dataHora === 'null' || dataHora === 'undefined' || dataHora === '') {
				if (!temDadosValidos) continue;
				erros++;
				continue;
			}
			if (!temDadosValidos && dataHora) {
				const dataHoraStr = String(dataHora).trim();
				const pareceDataValida =
					/\d{2}\/\d{2}\/\d{4}/.test(dataHoraStr) ||
					/^\d{4}-\d{2}-\d{2}/.test(dataHoraStr) ||
					dataHoraOriginal instanceof Date;
				if (!pareceDataValida) continue;
			}

			// Parse da data/hora (usa o valor original para preservar Date/number).
			let dataHoraObj: Date;
			const bruto = dataHoraOriginal;
			if (bruto instanceof Date) {
				dataHoraObj = bruto;
			} else if (typeof bruto === 'string') {
				const dataHoraLimpa = bruto.trim();
				const matchBR = dataHoraLimpa.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
				if (matchBR) {
					const [, dia, mes, ano, hora, minuto, segundo] = matchBR;
					dataHoraObj = instanteCivilSaoPauloSemDeslocamento(
						parseInt(ano, 10),
						parseInt(mes, 10) - 1,
						parseInt(dia, 10),
						parseInt(hora, 10),
						parseInt(minuto, 10),
						segundo ? parseInt(segundo, 10) : 0,
					);
				} else {
					const limpaFuso = dataHoraLimpa.trim();
					const temFusoExplicito = /Z$/i.test(limpaFuso) || /[+-]\d{2}:\d{2}(:\d{2})?$/.test(limpaFuso);
					if (temFusoExplicito) {
						dataHoraObj = new Date(limpaFuso);
					} else {
						const parsedDate = new Date(limpaFuso);
						if (!isNaN(parsedDate.getTime())) {
							dataHoraObj = instanteCivilSaoPauloSemDeslocamento(
								parsedDate.getFullYear(),
								parsedDate.getMonth(),
								parsedDate.getDate(),
								parsedDate.getHours(),
								parsedDate.getMinutes(),
								parsedDate.getSeconds(),
							);
						} else {
							dataHoraObj = parsedDate;
						}
					}
				}
			} else if (typeof bruto === 'number') {
				const diasDesde1900 = Math.floor(bruto);
				const fracaoDia = bruto - diasDesde1900;
				const dataBase = new Date(Date.UTC(1900, 0, 1) + (diasDesde1900 - 2) * 86400 * 1000);
				const totalSegundos = Math.round(fracaoDia * 86400);
				const h = Math.floor(totalSegundos / 3600);
				const m = Math.floor((totalSegundos % 3600) / 60);
				const s = totalSegundos % 60;
				dataHoraObj = instanteCivilSaoPauloSemDeslocamento(
					dataBase.getUTCFullYear(),
					dataBase.getUTCMonth(),
					dataBase.getUTCDate(),
					h,
					m,
					s,
				);
			} else {
				erros++;
				continue;
			}

			if (isNaN(dataHoraObj.getTime())) {
				erros++;
				continue;
			}
			const dataFim = calcularDataFim(dataHoraObj, 60);

			let tipoAgendamentoId: string | undefined;
			if (tipoAgendamento) {
				try {
					tipoAgendamentoId = await buscarOuCriarTipoPorTexto(String(tipoAgendamento));
				} catch (error) {
					console.log(`Erro ao criar/buscar tipo de agendamento: ${(error as Error).message}`);
				}
			}

			let coordenadoriaIdFinal = coordenadoriaId;
			if (coordenadoriaSigla && !coordenadoriaIdFinal) {
				try {
					coordenadoriaIdFinal = await buscarOuCriarCoordenadoriaPorSiglaImport(String(coordenadoriaSigla).trim());
				} catch (error) {
					console.log(`Erro ao buscar coordenadoria ${coordenadoriaSigla}:`, (error as Error).message);
				}
			}

			let tecnicoId: string | null = null;
			if (tecnicoNome) {
				const tecnicoNomeUpper = String(tecnicoNome).trim().toUpperCase();
				if (tecnicoNomeUpper.includes('TÉCNICO RESERVA') || tecnicoNomeUpper.includes('TECNICO RESERVA')) {
					const match = tecnicoNomeUpper.match(/T[ÉE]CNICO\s+RESERVA\s+(\w+)/);
					if (match && match[1] && !coordenadoriaIdFinal) {
						try {
							coordenadoriaIdFinal = await buscarOuCriarCoordenadoriaPorSiglaImport(match[1].trim());
						} catch (error) {
							console.log(`Erro ao buscar coordenadoria para TÉCNICO RESERVA:`, (error as Error).message);
						}
					}
					tecnicoId = null; // Atribuído manualmente pelo ponto focal.
				} else if (tecnicoRF) {
					tecnicoId = await buscarOuCriarTecnicoPorRF(
						String(tecnicoRF),
						coordenadoriaIdFinal || undefined,
						emailTecnico || undefined,
					);
				}
			} else if (tecnicoRF) {
				tecnicoId = await buscarOuCriarTecnicoPorRF(
					String(tecnicoRF),
					coordenadoriaIdFinal || undefined,
					emailTecnico || undefined,
				);
			}

			if (!dataHoraObj || isNaN(dataHoraObj.getTime())) {
				erros++;
				continue;
			}

			const processoTrim = processo ? String(processo).trim() : '';
			if (processoTrim) {
				const existente = await prisma.agendamento.findFirst({
					where: { processo: processoTrim, dataHora: dataHoraObj },
				});
				if (existente) {
					duplicados++;
					continue;
				}
			}

			try {
				const divisaoIdImport = await divisaoIdDoTecnico(tecnicoId);
				const criado = await prisma.agendamento.create({
					data: {
						municipe: municipe ? padronizarNome(String(municipe).trim()) : null,
						cpf: cpf ? String(cpf).trim() : null,
						processo: processoTrim || null,
						dataHora: dataHoraObj,
						dataFim,
						resumo: tipoAgendamento ? String(tipoAgendamento).trim() : null,
						tipoAgendamentoId,
						coordenadoriaId: coordenadoriaIdFinal || null,
						divisaoId: divisaoIdImport,
						tecnicoId,
						tecnicoRF: tecnicoRF ? String(tecnicoRF).trim() : null,
						email: email || null,
						importado: true,
						status: StatusAgendamento.SOLICITADO,
					},
				});
				importados++;
				if (tecnicoId) idsParaAgendar.push(criado.id);
			} catch (dbError) {
				console.error(`Linha ${index + 1}: Erro ao criar no banco de dados:`, (dbError as Error).message);
				erros++;
			}
		} catch (error) {
			console.error(`Erro ao importar linha ${index + 1}:`, (error as Error).message);
			erros++;
		}
	}

	await registrarImportacaoPlanilha(importados, usuarioId);
	let reunioesAgendadas = 0;
	let reunioesFalhas = 0;
	if (idsParaAgendar.length) {
		const r = await agendarReunioesEmLote(idsParaAgendar);
		reunioesAgendadas = r.agendadas;
		reunioesFalhas = r.falhas;
	}
	return { importados, erros, duplicados, reunioesAgendadas, reunioesFalhas };
}

export async function importarPlanilhaDeBuffer(
	buffer: Buffer,
	coordenadoriaId: string | undefined,
	usuarioId: string | undefined,
): Promise<ResultadoImportacao> {
	const dados = parsePlanilhaXlsx(buffer);
	if (!dados || dados.length === 0) return { importados: 0, erros: 0, duplicados: 0 };
	return processarImportacaoPlanilha(dados, coordenadoriaId, usuarioId);
}

// ===================================================================================
// PLANILHA OUTLOOK
// ===================================================================================

const HEADERS_OUTLOOK = [
	'Tipo de Atendimento',
	'Visitante',
	'CPF',
	'Horário',
	'Técnico Responsável',
	'Unidade',
	'Número do Processo',
] as const;

type HeaderOutlook = (typeof HEADERS_OUTLOOK)[number];

/** Port da leitura da planilha Outlook do controller (título com "Data:" + registros a partir da linha 5). */
function parsePlanilhaOutlookXlsx(buffer: Buffer): { dados: any[]; dataPlanilhaStr?: string } {
	const workbook = XLSX.read(buffer, { type: 'buffer' });
	if (!workbook.SheetNames?.length) throw new Error('Planilha vazia ou inválida');
	const worksheet = workbook.Sheets[workbook.SheetNames[0]];
	if (!worksheet) throw new Error('Não foi possível ler a planilha');

	const linhas1a3 = XLSX.utils.sheet_to_json(worksheet, {
		range: 'A1:G3',
		header: 1,
		defval: '',
	}) as unknown as (string | number)[][];
	let dataPlanilhaStr: string | undefined;
	const textoTopo = (Array.isArray(linhas1a3) ? linhas1a3.flat() : [])
		.map((c) => String(c ?? '').trim())
		.join(' ');
	const matchData = textoTopo.match(/Data:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
	if (matchData) {
		const [, d, m, a] = matchData;
		dataPlanilhaStr = `${d!.padStart(2, '0')}/${m!.padStart(2, '0')}/${a!}`;
	}

	const dados = XLSX.utils.sheet_to_json(worksheet, {
		range: 4,
		header: HEADERS_OUTLOOK as unknown as string[],
		defval: null,
	}) as any[];

	return { dados, dataPlanilhaStr };
}

/** Port de AgendamentosService.parseDataHoraOutlook. */
function parseDataHoraOutlook(val: string | number, dataPlanilhaStr?: string): Date | null {
	const num = typeof val === 'number' ? val : Number(String(val).replace(',', '.'));
	if (!Number.isNaN(num) && num >= 0 && num < 1) {
		const totalSegundos = num * 24 * 3600;
		const h = Math.floor(totalSegundos / 3600);
		const min = Math.round((totalSegundos % 3600) / 60);
		let dia: number, mes: number, ano: number;
		const parts = dataPlanilhaStr?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
		if (parts) {
			dia = Number(parts[1]);
			mes = Number(parts[2]) - 1;
			ano = Number(parts[3]);
		} else {
			const hoje = new Date();
			ano = hoje.getFullYear();
			mes = hoje.getMonth();
			dia = hoje.getDate();
		}
		const d = instanteCivilSaoPauloSemDeslocamento(ano, mes, dia, h, min, 0);
		return Number.isNaN(d.getTime()) ? null : d;
	}

	const s = String(val).trim();
	if (!s) return null;
	const d = new Date(s);
	if (!Number.isNaN(d.getTime())) return d;
	const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/.exec(s);
	if (br) {
		const [, dia, mes, ano, h, min] = br;
		const d2 = instanteCivilSaoPauloSemDeslocamento(Number(ano), Number(mes) - 1, Number(dia), Number(h), Number(min), 0);
		return Number.isNaN(d2.getTime()) ? null : d2;
	}
	const soHorario = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(s);
	if (soHorario) {
		const [, h, min] = soHorario;
		let dia: number, mes: number, ano: number;
		const parts = dataPlanilhaStr?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
		if (parts) {
			dia = Number(parts[1]);
			mes = Number(parts[2]) - 1;
			ano = Number(parts[3]);
		} else {
			const hoje = new Date();
			ano = hoje.getFullYear();
			mes = hoje.getMonth();
			dia = hoje.getDate();
		}
		const seg = Number(soHorario[3] ?? 0);
		const d3 = instanteCivilSaoPauloSemDeslocamento(ano, mes, dia, Number(h), Number(min), seg);
		return Number.isNaN(d3.getTime()) ? null : d3;
	}
	return null;
}

/** Port de AgendamentosService.importarPlanilhaOutlook. */
async function processarImportacaoOutlook(
	dadosPlanilha: any[],
	usuarioId: string | undefined,
	dataPlanilhaStr?: string,
): Promise<ResultadoImportacao> {
	let importados = 0;
	let erros = 0;
	let duplicados = 0;

	if (!dadosPlanilha || !Array.isArray(dadosPlanilha)) {
		throw new Error('Dados da planilha Outlook inválidos');
	}

	for (let index = 0; index < dadosPlanilha.length; index++) {
		const row = dadosPlanilha[index];
		if (!row || typeof row !== 'object') {
			erros++;
			continue;
		}

		const get = (key: HeaderOutlook): string | null => {
			const v = row[key];
			if (v === null || v === undefined) return null;
			const s = String(v).trim();
			return s === '' ? null : s;
		};
		const getRaw = (key: HeaderOutlook): string | number | null => {
			const v = row[key];
			if (v === null || v === undefined) return null;
			if (typeof v === 'number' && !Number.isNaN(v)) return v;
			const s = String(v).trim();
			return s === '' ? null : s;
		};

		const visitante = get('Visitante');
		const horarioRaw = getRaw('Horário');
		if (!visitante && (horarioRaw === null || horarioRaw === undefined)) continue;
		const tipoStr = get('Tipo de Atendimento');
		if (tipoStr && tipoStr.toUpperCase() === 'TIPO DE ATENDIMENTO') continue;
		if (!visitante || horarioRaw === null || horarioRaw === undefined) {
			erros++;
			continue;
		}

		try {
			const tipoTexto = get('Tipo de Atendimento');
			let tipoAgendamentoId: string | undefined;
			if (tipoTexto) tipoAgendamentoId = await buscarOuCriarTipoPorTexto(tipoTexto);

			const unidadeStr = get('Unidade');
			let coordenadoriaId: string | undefined;
			if (unidadeStr) {
				const coordPorSigla = await buscarCoordenadoriaPorSigla(unidadeStr);
				if (coordPorSigla) {
					coordenadoriaId = coordPorSigla.id;
				} else {
					const coordPorNome = await prisma.coordenadoria.findFirst({
						where: {
							OR: [{ sigla: { contains: unidadeStr } }, { nome: { contains: unidadeStr } }],
							status: true,
						},
					});
					if (coordPorNome) coordenadoriaId = coordPorNome.id;
				}
			}

			const dataHora = parseDataHoraOutlook(horarioRaw, dataPlanilhaStr);
			if (!dataHora) {
				erros++;
				continue;
			}

			const processoRaw = get('Número do Processo');
			const processoOutlook = processoRaw ? String(processoRaw).trim() : '';
			const cpf = get('CPF');
			const tecnicoResponsavelPlanilha = get('Técnico Responsável');

			const duplicado = await prisma.agendamento.findFirst({
				where: {
					processo: processoOutlook || undefined,
					dataHora,
					coordenadoriaId: coordenadoriaId || undefined,
					importadoOutlook: true,
				},
			});
			if (duplicado) {
				duplicados++;
				continue;
			}

			const umaHoraDepois = new Date(dataHora.getTime() + 60 * 60 * 1000);
			await prisma.agendamento.create({
				data: {
					municipe: visitante,
					cpf: cpf || undefined,
					processo: processoOutlook || undefined,
					dataHora,
					dataFim: umaHoraDepois,
					importado: true,
					importadoOutlook: true,
					tecnicoResponsavelPlanilha: tecnicoResponsavelPlanilha || undefined,
					tipoAgendamentoId: tipoAgendamentoId || undefined,
					coordenadoriaId: coordenadoriaId || undefined,
					tecnicoId: undefined,
					status: StatusAgendamento.SOLICITADO,
				},
			});
			importados++;
		} catch (e) {
			console.error(`[Outlook import] Linha ${index + 5}: ${(e as Error).message}`);
			erros++;
		}
	}

	await registrarImportacaoOutlook(importados, usuarioId);
	return { importados, erros, duplicados };
}

export async function importarPlanilhaOutlookDeBuffer(
	buffer: Buffer,
	usuarioId: string | undefined,
): Promise<ResultadoImportacao> {
	const { dados, dataPlanilhaStr } = parsePlanilhaOutlookXlsx(buffer);
	if (!dados || dados.length === 0) return { importados: 0, erros: 0, duplicados: 0 };
	return processarImportacaoOutlook(dados, usuarioId, dataPlanilhaStr);
}
