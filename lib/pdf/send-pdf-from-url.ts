import { sendDocumentMessage } from "@/lib/connectors/uazapi";
import { fetchWithTimeout, isAbortError, parseIntegerEnv } from "@/lib/connectors/utils";
import { logger } from "@/lib/logger";

/**
 * Baixa um PDF de uma URL e envia como documento pelo WhatsApp.
 *
 * Aceita links diretos de PDF e links de compartilhamento do Google Drive
 * (converte para download direto). Valida que o conteúdo é um PDF e respeita um
 * limite de tamanho (WhatsApp/Uazapi tem limites de mídia).
 *
 * Retorna { success, messageId?, error? }. Nunca lança.
 */
export type SendPdfResult = {
  success: boolean;
  messageId?: string | null;
  error?: string;
};

/**
 * Converte um link de compartilhamento do Google Drive em URL de download direto.
 * Ex.: https://drive.google.com/file/d/ABC123/view?usp=sharing
 *   →  https://drive.google.com/uc?export=download&id=ABC123
 * Para outros domínios, retorna a URL como está.
 */
export function toDirectDownloadUrl(url: string): string {
  const driveFile = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveFile) {
    return `https://drive.google.com/uc?export=download&id=${driveFile[1]}`;
  }
  const driveOpen = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (driveOpen) {
    return `https://drive.google.com/uc?export=download&id=${driveOpen[1]}`;
  }
  return url;
}

/** Gera um nome de arquivo seguro para o PDF a partir do nome da empresa. */
function pdfFileName(company: string, kind: string): string {
  const safe = company
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${kind}-${safe || "lead"}.pdf`;
}

export async function sendPdfFromUrl(params: {
  jid: string;
  pdfUrl: string;
  caption: string;
  company: string;
  kind: string; // ex.: "previa-gmn", "relatorio-gmn"
}): Promise<SendPdfResult> {
  const { jid, pdfUrl, caption, company, kind } = params;

  if (!/^https?:\/\//i.test(pdfUrl)) {
    return { success: false, error: "Link inválido: informe uma URL http(s) do PDF." };
  }

  const downloadUrl = toDirectDownloadUrl(pdfUrl);
  const timeoutMs = Math.max(3000, parseIntegerEnv("PDF_DOWNLOAD_TIMEOUT_MS", 20000));
  const maxBytes = Math.max(1, parseIntegerEnv("PDF_MAX_MB", 15)) * 1024 * 1024;

  let buffer: Buffer;
  try {
    const response = await fetchWithTimeout(downloadUrl, { cache: "no-store" }, timeoutMs);
    if (!response.ok) {
      return { success: false, error: `Não foi possível baixar o PDF (HTTP ${response.status}).` };
    }

    const contentType = response.headers.get("content-type") ?? "";
    // O Google Drive às vezes responde text/html (página de confirmação) para
    // arquivos grandes ou sem permissão pública.
    if (/text\/html/i.test(contentType)) {
      return {
        success: false,
        error:
          "O link não retornou um PDF. Confirme que o arquivo é público " +
          '("qualquer pessoa com o link") e é um PDF.',
      };
    }

    const arrayBuf = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuf);

    if (buffer.byteLength > maxBytes) {
      return {
        success: false,
        error: `PDF muito grande (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB). Limite: ${maxBytes / 1024 / 1024} MB.`,
      };
    }

    // Confere a "assinatura" de um PDF: começa com "%PDF-".
    const header = buffer.subarray(0, 5).toString("latin1");
    if (!header.startsWith("%PDF-")) {
      return { success: false, error: "O arquivo baixado não é um PDF válido." };
    }
  } catch (error) {
    if (isAbortError(error)) return { success: false, error: "Tempo esgotado ao baixar o PDF." };
    return { success: false, error: "Falha ao baixar o PDF do link informado." };
  }

  const sendResult = await sendDocumentMessage(
    jid,
    caption,
    buffer.toString("base64"),
    pdfFileName(company, kind)
  );

  if (!sendResult.success) {
    logger.warn("Falha ao enviar PDF via WhatsApp", { company, error: sendResult.error });
    return { success: false, error: sendResult.error ?? "Falha ao enviar o PDF." };
  }

  return { success: true, messageId: sendResult.messageId };
}
