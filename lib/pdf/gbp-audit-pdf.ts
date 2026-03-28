import PDFDocument from "pdfkit";
import type { GbpAuditPdfOptions, GbpBlurrableField } from "@/types/gbp-audit";

const PAGE_MARGIN = 50;
const CONTENT_WIDTH = 595.28 - PAGE_MARGIN * 2; // A4 width minus margins

/**
 * Gera um PDF de auditoria GBP com campos sensíveis borrados.
 * Retorna o PDF como Buffer (pronto para envio via WhatsApp).
 */
export async function generateGbpAuditPdf(options: GbpAuditPdfOptions): Promise<Buffer> {
  const { data, blurredFields, brandName, brandColor } = options;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: PAGE_MARGIN,
      info: {
        Title: `Analise GBP - ${data.companyName}`,
        Author: brandName,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // --- Header ---
    drawHeader(doc, brandName, brandColor);

    // --- Título ---
    doc.moveDown(1.5);
    doc.fontSize(18).fillColor("#1a1a1a").text("Relatório de Análise", { align: "center" });
    doc.fontSize(12).fillColor("#666666").text("Perfil Google Meu Negócio", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor("#1a1a1a").text(data.companyName, { align: "center" });
    doc.fontSize(10).fillColor("#888888").text(data.address, { align: "center" });
    doc.moveDown(1);

    // --- Linha divisória ---
    drawDivider(doc, brandColor);

    // --- Score geral ---
    doc.moveDown(0.8);
    drawScoreSection(doc, data.overallScore, brandColor);
    doc.moveDown(1);

    // --- Dados visíveis (sempre mostrados) ---
    drawSectionTitle(doc, "Dados do Perfil");
    drawInfoRow(doc, "Nota", data.rating > 0 ? `${data.rating.toFixed(1)} estrelas` : "Sem nota");
    drawInfoRow(doc, "Avaliações", `${data.reviewCount} avaliação(ões)`);
    drawInfoRow(doc, "Website", data.hasWebsite ? "Vinculado" : "Não vinculado");
    drawInfoRow(doc, "Telefone", data.phoneNumber || "Não informado");
    drawInfoRow(doc, "Fotos estimadas", data.photoEstimate);
    doc.moveDown(0.8);

    // --- Categoria (pode ser borrada) ---
    drawSectionTitle(doc, "Otimização de Categoria");
    if (isBlurred("categoryOptimization", blurredFields)) {
      drawBlurredBlock(doc, "Análise de categoria e subcategorias do perfil");
    } else {
      drawInfoRow(doc, "Status", data.categoryOptimization);
    }
    doc.moveDown(0.8);

    // --- Taxa de resposta (pode ser borrada) ---
    drawSectionTitle(doc, "Taxa de Resposta às Avaliações");
    if (isBlurred("responseRate", blurredFields)) {
      drawBlurredBlock(doc, "Taxa estimada de resposta e benchmark da região");
    } else {
      drawInfoRow(doc, "Estimativa", data.responseRate);
    }
    doc.moveDown(0.8);

    // --- Nova página para recomendações ---
    doc.addPage();
    drawHeader(doc, brandName, brandColor);
    doc.moveDown(1.5);

    // --- Recomendações de melhorias (borradas) ---
    drawSectionTitle(doc, "Recomendações de Melhoria");
    if (isBlurred("improvements", blurredFields)) {
      for (const item of data.improvements) {
        drawBlurredRecommendation(doc, item.area, item.impact);
      }
    } else {
      for (const item of data.improvements) {
        drawInfoRow(doc, `${item.area} (${item.impact})`, item.recommendation);
      }
    }
    doc.moveDown(0.8);

    // --- Comparativo com concorrentes (borrado) ---
    drawSectionTitle(doc, "Comparativo Regional");
    if (isBlurred("competitors", blurredFields)) {
      drawBlurredBlock(doc, "Comparativo detalhado com concorrentes da região em 3 dimensões");
      doc.moveDown(0.3);
      drawBlurredBlock(doc, "Posicionamento relativo e oportunidades identificadas");
    } else {
      for (const insight of data.competitors) {
        drawInfoRow(
          doc,
          insight.metric,
          `Você: ${insight.yourValue} | Média: ${insight.regionAverage} (${insight.verdict})`
        );
      }
    }

    // --- CTA final ---
    doc.moveDown(1.5);
    drawDivider(doc, brandColor);
    doc.moveDown(0.8);
    drawCta(doc, brandColor);

    // --- Rodapé ---
    doc.moveDown(1);
    doc
      .fontSize(8)
      .fillColor("#aaaaaa")
      .text(
        `Gerado por ${brandName} | ${new Date().toLocaleDateString("pt-BR")} | Dados estimados com base em informações públicas`,
        { align: "center" }
      );

    doc.end();
  });
}

// --- Drawing helpers ---

function drawHeader(doc: PDFKit.PDFDocument, brandName: string, brandColor: string): void {
  const y = doc.y;
  doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, 3).fill(brandColor);
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor(brandColor).text(brandName.toUpperCase(), {
    align: "right",
    characterSpacing: 2,
  });
}

function drawDivider(doc: PDFKit.PDFDocument, color: string): void {
  const y = doc.y;
  doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, 1).fill(color).opacity(0.3);
  doc.opacity(1);
  doc.moveDown(0.2);
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  doc.fontSize(13).fillColor("#1a1a1a").text(title, { underline: false });
  doc.moveDown(0.3);
}

function drawInfoRow(doc: PDFKit.PDFDocument, label: string, value: string): void {
  const y = doc.y;
  doc.fontSize(10).fillColor("#555555").text(`${label}:`, PAGE_MARGIN, y, { continued: true });
  doc.fillColor("#1a1a1a").text(`  ${value}`);
  doc.moveDown(0.15);
}

function drawScoreSection(doc: PDFKit.PDFDocument, score: number, brandColor: string): void {
  const centerX = 595.28 / 2;

  // Círculo de score
  doc
    .circle(centerX, doc.y + 25, 30)
    .fill(brandColor)
    .opacity(0.1);
  doc.opacity(1);
  doc
    .circle(centerX, doc.y + 25, 30)
    .lineWidth(2)
    .stroke(brandColor);

  doc
    .fontSize(22)
    .fillColor(brandColor)
    .text(`${score}`, centerX - 18, doc.y + 12, { width: 36, align: "center" });

  doc.moveDown(2.5);
  doc.fontSize(10).fillColor("#666666").text("Score de Visibilidade (0-100)", { align: "center" });
}

function drawBlurredBlock(doc: PDFKit.PDFDocument, description: string): void {
  const y = doc.y;
  const blockHeight = 28;

  // Retângulo cinza (simula borragem)
  doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, blockHeight).fill("#e8e8e8");

  // Linhas "texto borrado" dentro do retângulo
  const lineY = y + 8;
  doc.rect(PAGE_MARGIN + 12, lineY, CONTENT_WIDTH * 0.6, 4).fill("#d0d0d0");
  doc.rect(PAGE_MARGIN + 12, lineY + 8, CONTENT_WIDTH * 0.4, 4).fill("#d0d0d0");

  // Ícone de cadeado (texto)
  doc
    .fontSize(8)
    .fillColor("#999999")
    .text("🔒 " + description, PAGE_MARGIN + CONTENT_WIDTH * 0.65, y + 8, {
      width: CONTENT_WIDTH * 0.32,
      align: "right",
    });

  doc.y = y + blockHeight + 6;
}

function drawBlurredRecommendation(doc: PDFKit.PDFDocument, area: string, impact: string): void {
  const y = doc.y;
  const blockHeight = 36;

  // Retângulo com borda
  doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, blockHeight).fill("#f5f5f5");
  doc
    .rect(PAGE_MARGIN, y, 4, blockHeight)
    .fill(impact === "Alto" ? "#e74c3c" : impact === "Medio" ? "#f39c12" : "#95a5a6");

  // Área visível (o nome da área e impacto ficam legíveis)
  doc
    .fontSize(10)
    .fillColor("#333333")
    .text(area, PAGE_MARGIN + 12, y + 5);
  doc
    .fontSize(8)
    .fillColor("#999999")
    .text(`Impacto: ${impact}`, PAGE_MARGIN + 12, y + 19);

  // Recomendação borrada
  doc.rect(PAGE_MARGIN + 140, y + 6, CONTENT_WIDTH - 160, 4).fill("#d0d0d0");
  doc.rect(PAGE_MARGIN + 140, y + 14, CONTENT_WIDTH - 200, 4).fill("#d0d0d0");
  doc.rect(PAGE_MARGIN + 140, y + 22, CONTENT_WIDTH - 180, 4).fill("#d0d0d0");

  doc.y = y + blockHeight + 6;
}

function drawCta(doc: PDFKit.PDFDocument, brandColor: string): void {
  const y = doc.y;
  const ctaHeight = 50;

  doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, ctaHeight).fill(brandColor).opacity(0.08);
  doc.opacity(1);
  doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, ctaHeight).lineWidth(1).stroke(brandColor);

  doc
    .fontSize(12)
    .fillColor(brandColor)
    .text(
      "Para receber o relatório completo com todas as recomendações,",
      PAGE_MARGIN + 15,
      y + 10,
      { width: CONTENT_WIDTH - 30, align: "center" }
    );
  doc.fontSize(12).fillColor("#1a1a1a").text("responda esta mensagem.", { align: "center" });
}

function isBlurred(field: GbpBlurrableField, blurredFields: GbpBlurrableField[]): boolean {
  return blurredFields.includes(field);
}
