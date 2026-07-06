import type { ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"
import iconFaq from "@/public/icons/FAQ.png"
import { ArthurSaboyaFooter } from "@/components/arthur-saboya/footer"
import { ArthurSaboyaHeader } from "@/components/arthur-saboya/header"
import { ArthurSaboyaPageBackgroundBanner } from "@/components/arthur-saboya/page-background-banner"
import { openSans } from "@/lib/fonts"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const BASE = "/portal"
const FAZENDA_IPTU_URL = "https://prefeitura.sp.gov.br/web/fazenda/servicos/iptu/"
const SIMPROC_URL = "https://simprocservicos.prefeitura.sp.gov.br/Forms/consultarProcessos.aspx"

type FaqItem = {
  id: string
  pergunta: string
  resposta: ReactNode
}

function Answer({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed wrap-break-word text-muted-foreground sm:text-base">
      {children}
    </div>
  )
}

function P({ children }: { children: ReactNode }) {
  return <p className="hyphens-auto">{children}</p>
}

const FAQS: FaqItem[] = [
  {
    id: "q1",
    pergunta:
      "1. A Secretaria Municipal de Urbanismo e Licenciamento (SMUL) é responsável pela aprovação de quais tipos de projeto?",
    resposta: (
      <Answer>
        <P>
          A Secretaria Municipal de Urbanismo e Licenciamento é responsável pela análise de projetos de
          empreendimentos de Habitação de Interesse Social e Popular (HIS) e Habitação de Mercado Popular
          (HMP) de residenciais verticais e horizontais, projetos não residenciais e usos industriais.
        </P>
        <P>
          Compete também à SMUL a análise de processos de regularização, de segurança da edificação, como
          pedidos de Alvará de Funcionamento para Locais de Reunião, para eventos temporários, licenciamento
          de elevadores e tanques bombas.
        </P>
      </Answer>
    ),
  },
  {
    id: "q2",
    pergunta: "2. Como faço para saber em que setor da Prefeitura está o meu processo?",
    resposta: (
      <Answer>
        <P>
          Com o número do processo em mãos, no{" "}
          <a
            href={SIMPROC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2 hover:no-underline"
          >
            SIMPROC
          </a>{" "}
          na página da Prefeitura, pode-se acompanhar a tramitação.
        </P>
      </Answer>
    ),
  },
  {
    id: "q3",
    pergunta: "3. Posso tirar dúvidas sobre o meu projeto com um técnico da Prefeitura?",
    resposta: (
      <Answer>
        <P>
          O atendimento técnico deve ser feito diretamente na Sala Arthur Saboya, de acordo com a competência
          da aprovação. Há também o Núcleo de Atendimento, onde o munícipe pode tirar dúvidas com o próprio
          técnico responsável pela análise de seu projeto.
        </P>
      </Answer>
    ),
  },
  {
    id: "q4",
    pergunta:
      "4. Meu processo foi indeferido. Como faço para pedir um recurso/reconsideração de despacho?",
    resposta: (
      <Answer>
        <P>
          O pedido de recurso/reconsideração de despacho deve ser solicitado da mesma maneira como a primeira
          solicitação foi realizada. Se o pedido inicial foi feito pelo SEI, Portal de Licenciamento ou Aprova
          Digital, o recurso deve ser solicitado pelo mesmo canal.
        </P>
      </Answer>
    ),
  },
  {
    id: "q5",
    pergunta: "5. A medida do meu imóvel no IPTU está errada. Como faço para corrigir?",
    resposta: (
      <Answer>
        <P>Todos os assuntos referentes ao IPTU são de competência da Secretaria Municipal da Fazenda.</P>
        <P>
          Acesse o site da Secretaria da Fazenda (IPTU) em prefeitura.sp.gov.br &gt; &quot;Encontre
          secretarias&quot; &gt; selecione &quot;Fazenda&quot; &gt; &quot;IPTU&quot; ou{" "}
          <a
            href={FAZENDA_IPTU_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2 hover:no-underline"
          >
            clicando aqui
          </a>
          .
        </P>
      </Answer>
    ),
  },
  {
    id: "q6",
    pergunta:
      "6. Meu terreno/lote se encontra em uma área de patrimônio ambiental, ainda posso entrar com o processo?",
    resposta: (
      <Answer>
        <P>
          Com a confirmação que o local se encontra em uma área de patrimônio ambiental, é de responsabilidade
          da pessoa solicitante (proprietário/responsável técnico) entrar com o pedido de anuência do órgão
          responsável.
        </P>
        <P>
          Recomendamos que entre em contato com a Secretaria do Verde e Meio Ambiente para verificar a qual
          órgão deverá ser solicitada a anuência, dependendo do caso.
        </P>
        <P>
          Contato SVMA (Secretaria do Verde e Meio Ambiente):{" "}
          <a
            href="mailto:svmagtmapp@prefeitura.sp.gov.br"
            className="font-medium text-primary underline underline-offset-2 hover:no-underline"
          >
            svmagtmapp@prefeitura.sp.gov.br
          </a>
          .
        </P>
      </Answer>
    ),
  },
  {
    id: "q7",
    pergunta:
      "7. Preciso de autorização para construir em um local considerado “área de contaminação”?",
    resposta: (
      <Answer>
        <P>
          Se a área for considerada “de contaminação”, será necessário autuar um Processo Administrativo de
          “Áreas contaminadas: Avaliação Ambiental” na Secretaria do Verde e do Meio Ambiente (SVMA) contendo
          toda a documentação da listagem mencionada em “Autuação de Processos Administrativos”.
        </P>
        <P>
          Para conferir a listagem de documentos entre no site da Secretaria do Verde e Meio Ambiente, clique
          no item &quot;Áreas Contaminadas&quot; no menu do lado esquerdo, e depois em &quot;Autuação de
          Processo Administrativo&quot;.
        </P>
        <P>
          Caso receba a anuência do órgão responsável (Cetesb), será possível entrar com o pedido de obra,
          respeitando as condições estabelecidas pelo mesmo.
        </P>
      </Answer>
    ),
  },
  {
    id: "q8",
    pergunta:
      "8. Qual a diferença entre o alvará para reforma e o alvará para demolição?",
    resposta: (
      <Answer>
        <P>
          O alvará para reforma deve ser solicitado quando parte da obra existente regular será mantida no
          terreno.
        </P>
        <P>
          Já o alvará de demolição é somente para os casos em que o terreno ficará sem construção alguma.
          Neste caso, não há a necessidade do imóvel a ser demolido estar regular.
        </P>
      </Answer>
    ),
  },
  {
    id: "q9",
    pergunta:
      "9. Qual a diferença entre o Certificado de Conclusão (Habite-se) e o Certificado de Regularização?",
    resposta: (
      <Answer>
        <P>
          O Certificado de Conclusão (Habite-se) é o documento que atesta que o imóvel é habitável, enquanto
          o Certificado de Regularização é o documento equivalente ao Auto de Conclusão, ao Habite-se, ao Auto
          de Vistoria e ao Alvará de Conservação.
        </P>
        <P>
          Pode ser utilizado para instruir pedidos de Licença de Funcionamento, Aprovação de Reformas e para
          comprovar a regularidade do imóvel perante o INSS, a fiscalização municipal e o Cartório de Registro
          de Imóveis.
        </P>
        <P>
          O Certificado de Regularização e o Habite-se são documentos diferentes, porém equivalentes. Se o
          imóvel foi regularizado, possuirá o Certificado de Regularidade. Se teve o pedido de construção
          aprovado, foi executado e concluído, então poderá ser solicitado o Habite-se. O imóvel terá um ou
          outro.
        </P>
      </Answer>
    ),
  },
  {
    id: "q10",
    pergunta:
      "10. Quero realizar uma obra em local de passeio público e vou precisar solicitar tapumes para o entorno. Posso solicitar o alvará para execução da obra juntamente com o alvará de autorização de tapume?",
    resposta: (
      <Answer>
        <P>
          Sim. A princípio, para pedir o alvará de tapume, é necessário já possuir o número do processo de
          aprovação da obra a ser realizada.
        </P>
      </Answer>
    ),
  },
  {
    id: "q11",
    pergunta:
      "11. É possível entrar com um pedido de alvará para uma edificação que está irregular?",
    resposta: (
      <Answer>
        <P>
          Se a edificação está irregular, só é possível protocolar dois tipos de processos: o de regularização
          e o de demolição do imóvel.
        </P>
      </Answer>
    ),
  },
  {
    id: "q12",
    pergunta:
      "12. Estou tendo problemas com o site do Portal de Licenciamento. O que fazer?",
    resposta: (
      <Answer>
        <P>
          Entre em contato com a equipe de suporte técnico por meio do e-mail:{" "}
          <a
            href="mailto:portaldelicenciamento@prefeitura.sp.gov.br"
            className="font-medium text-primary underline underline-offset-2 hover:no-underline"
          >
            portaldelicenciamento@prefeitura.sp.gov.br
          </a>
          .
        </P>
        <P>
          É importante descrever o ocorrido e, se possível, incluir capturas de tela do erro e o número do
          protocolo/processo em questão.
        </P>
      </Answer>
    ),
  },
]

export default function PerguntasFrequentesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <ArthurSaboyaHeader />
      <ArthurSaboyaPageBackgroundBanner>
        <Link
          href={BASE}
          className="mb-3 inline-flex items-center gap-2 text-sm text-white/90 transition-colors hover:text-white sm:mb-4"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Voltar ao Início
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#E56E14]">
            <Image
              src={iconFaq}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Perguntas e respostas</h1>
            <p className="mt-1 max-w-2xl text-sm leading-snug text-white/90 sm:text-base">
              Dúvidas frequentes sobre a SMUL, processos e serviços relacionados
            </p>
          </div>
        </div>
      </ArthurSaboyaPageBackgroundBanner>
      <main className="flex-1">
        <section className="bg-[#D1EBE8]/20 py-8 sm:py-12">
          <div className="container mx-auto max-w-3xl px-3 sm:px-4">
            <Accordion type="single" collapsible className="w-full min-w-0">
              {FAQS.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger
                    className={`${openSans.className} wrap-break-word text-left text-[15px] font-normal leading-snug text-[#0E171E] hover:no-underline sm:text-[16px]`}
                  >
                    <span className="min-w-0 flex-1 pr-1">{faq.pergunta}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-[#4C575F] [&_a]:break-all">
                    {faq.resposta}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <ArthurSaboyaFooter />
    </div>
  )
}
