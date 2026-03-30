/**
 * Captura relatório real do GBP Check via Playwright + extensão Chrome.
 *
 * Fluxo:
 * 1. Abre Chrome com perfil copiado (extensão GBP Check + cookies)
 * 2. Busca o negócio por nome na Pré Análise
 * 3. Extensão gera a análise
 * 4. Expande todas as seções
 * 5. Embaça itens incompletos (< 100%) com overlay
 * 6. Captura screenshots por viewport e gera PDF
 */
import { chromium, type BrowserContext, type Page } from "playwright";
import { imageSize } from "image-size";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BROWSER_DATA_DIR = path.join(__dirname, "..", "..", ".gbpcheck-browser");
const AUTH_FILE = path.join(__dirname, "..", "..", "gbpcheck-auth.json");
const PRE_ANALYSIS_URL = "https://app.gbpcheck.com/extension-v2/healthcheck?v=2";

export type GbpCheckCaptureResult = {
  success: boolean;
  pdfBuffer?: Buffer;
  score?: number;
  error?: string;
};

/**
 * Captura relatório do GBP Check para um negócio.
 * Retorna Buffer do PDF com itens incompletos embaçados.
 */
export async function captureGbpCheckReport(businessName: string): Promise<GbpCheckCaptureResult> {
  if (!fs.existsSync(BROWSER_DATA_DIR)) {
    return {
      success: false,
      error: "Perfil do browser não encontrado. Rode: npx tsx scripts/gbpcheck-login.ts",
    };
  }
  if (!fs.existsSync(AUTH_FILE)) {
    return {
      success: false,
      error: "Sessão não encontrada. Rode: npx tsx scripts/gbpcheck-login.ts",
    };
  }

  let context: BrowserContext | null = null;

  try {
    // 1. Abrir Chrome com extensão
    context = await chromium.launchPersistentContext(BROWSER_DATA_DIR, {
      headless: false,
      channel: "chrome",
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 1.5,
      args: ["--disable-blink-features=AutomationControlled"],
      ignoreDefaultArgs: ["--enable-automation", "--disable-extensions"],
    });

    // Injetar cookies
    const authData = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
    if (authData.cookies) {
      await context.addCookies(authData.cookies);
    }

    const page = context.pages()[0] || (await context.newPage());

    // 2. Navegar para Pré Análise
    await page.goto(PRE_ANALYSIS_URL, { waitUntil: "networkidle", timeout: 30000 });

    if (page.url().includes("/login")) {
      return { success: false, error: "Sessão expirada. Rode gbpcheck-login.ts novamente." };
    }

    // 3. Buscar negócio
    const searchResult = await searchBusiness(page, businessName);
    if (!searchResult.success) {
      return { success: false, error: searchResult.error };
    }

    // 4. Iniciar análise
    const analysisResult = await startAnalysis(page);
    if (!analysisResult.success) {
      return { success: false, error: analysisResult.error };
    }

    // 5. Aguardar relatório
    await waitForReport(page);

    // 6. Extrair score
    const score = await extractScore(page);

    // 7. Expandir seções
    await expandAllSections(page);

    // 8. Embaçar itens incompletos
    await blurIncompleteItems(page);

    // 9. Limpar interface
    await cleanLayoutForPdf(page);

    // 10. Scroll para renderizar lazy content
    await scrollToLoadAll(page);

    // 11. Capturar PDF
    const pdfBuffer = await captureAsPdf(page);

    return { success: true, pdfBuffer, score };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return { success: false, error: msg };
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
  }
}

async function searchBusiness(
  page: Page,
  businessName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await page.click("#selected-gmb-profile", { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.click("#search-locations-selector-apiv2", { timeout: 5000 });
    await page.waitForTimeout(500);

    const input = page.locator("#locations-dropdown-input-apiv2");
    await input.clear();
    await input.fill(businessName);

    const suggestion = page.locator(".dropdown-item").first();
    await suggestion.waitFor({ state: "visible", timeout: 10000 });
    await suggestion.click();

    return { success: true };
  } catch {
    return { success: false, error: `Negócio "${businessName}" não encontrado no autocomplete.` };
  }
}

async function startAnalysis(page: Page): Promise<{ success: boolean; error?: string }> {
  await page.waitForTimeout(2000);

  const iniciarBtn = page.locator(
    'button:has-text("Iniciar Análise"), a:has-text("Iniciar Análise")'
  );
  if (await iniciarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await iniciarBtn.click();
  }

  await page.waitForTimeout(3000);

  const modalStatus = await page.evaluate(() => {
    const modal = document.getElementById("ext-status-modal-apiv2");
    if (!modal || modal.style.display === "none") return null;
    const text = modal.textContent?.trim() || "";
    return {
      isError: text.includes("Extensão não detectada") || text.includes("Erro"),
      text: text.substring(0, 200),
    };
  });

  if (modalStatus?.isError) {
    return { success: false, error: "Extensão GBP Check não detectada." };
  }

  // Fechar modal
  await page.evaluate(() => {
    const modal = document.getElementById("ext-status-modal-apiv2");
    if (modal) modal.remove();
  });

  return { success: true };
}

async function waitForReport(page: Page): Promise<void> {
  try {
    await page.waitForFunction(() => document.querySelector(".metrics-score-display") !== null, {
      timeout: 120000,
    });
  } catch {
    // Continua mesmo com timeout
  }
  await page.waitForTimeout(3000);
}

async function extractScore(page: Page): Promise<number | undefined> {
  return page.evaluate(() => {
    const el = document.querySelector(".metrics-score-display");
    const match = el?.textContent?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  });
}

async function expandAllSections(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll(".thermometer-title-section").forEach((el) => {
      (el as HTMLElement).click();
    });
  });
  await page.waitForTimeout(3000);
}

async function blurIncompleteItems(page: Page): Promise<number> {
  return page.evaluate(() => {
    let count = 0;
    const progressSections = document.querySelectorAll(".thermometer-progress-section");

    progressSections.forEach((progressEl) => {
      const progressText = progressEl.textContent?.trim() || "";
      const match = progressText.match(/(\d+)%/);
      if (!match) return;

      const percent = parseInt(match[1], 10);
      if (percent >= 100) return;

      count++;

      const container = progressEl.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      // Wrapper com posição relativa
      const wrapper = document.createElement("div");
      wrapper.setAttribute(
        "style",
        ["position: relative", "min-height: " + rect.height + "px"].join(";")
      );
      container.parentElement!.insertBefore(wrapper, container);

      // Conteúdo com blur
      const blurDiv = document.createElement("div");
      blurDiv.setAttribute(
        "style",
        [
          "filter: blur(5px)",
          "-webkit-filter: blur(5px)",
          "user-select: none",
          "pointer-events: none",
        ].join(";")
      );
      blurDiv.appendChild(container);
      wrapper.appendChild(blurDiv);

      // Overlay (fora do blur)
      const overlay = document.createElement("div");
      overlay.setAttribute(
        "style",
        [
          "position: absolute",
          "top: 0",
          "left: 0",
          "right: 0",
          "bottom: 0",
          "display: flex",
          "align-items: center",
          "justify-content: center",
          "z-index: 999",
          "background: rgba(255, 255, 255, 0.2)",
        ].join(";")
      );

      const badge = document.createElement("div");
      badge.setAttribute(
        "style",
        [
          "background: rgba(0, 0, 0, 0.85)",
          "color: white",
          "padding: 10px 24px",
          "border-radius: 8px",
          "font-size: 15px",
          "font-weight: bold",
          "box-shadow: 0 2px 10px rgba(0,0,0,0.3)",
        ].join(";")
      );
      badge.innerHTML = "&#x1F512; Disponível no relatório completo";

      overlay.appendChild(badge);
      wrapper.appendChild(overlay);
    });

    return count;
  });
}

async function cleanLayoutForPdf(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Remover sidebar
    const sidebar = document.querySelector(".sidebar") as HTMLElement;
    if (sidebar) sidebar.style.display = "none";

    // Remover navbars
    const navbars = document.querySelectorAll(".navbar") as NodeListOf<HTMLElement>;
    navbars.forEach((n) => (n.style.display = "none"));

    // Remover breadcrumb
    const breadcrumb = document.querySelector(".breadcrumb-line") as HTMLElement;
    if (breadcrumb) breadcrumb.style.display = "none";

    // Remover chat widget
    const crisp = document.querySelector(".crisp-client") as HTMLElement;
    if (crisp) crisp.style.display = "none";

    // Remover footer
    const footer = document.querySelector(".navbar-footer") as HTMLElement;
    if (footer) footer.style.display = "none";

    // Expandir conteúdo e remover overflow scroll
    const content = document.getElementById("contentMainWrapperId") as HTMLElement;
    if (content) {
      content.style.marginLeft = "0";
      content.style.paddingTop = "20px";
      content.style.overflow = "visible";
      content.style.overflowY = "visible";
      content.style.height = "auto";
      content.style.maxHeight = "none";
    }

    // Remover botões de ação
    const actionBtns = document.querySelectorAll(
      "#dropdownMenuButtonActionsID, #dropdownMenuButtonActionsIDHelp"
    ) as NodeListOf<HTMLElement>;
    actionBtns.forEach((b) => {
      const parent = b.closest(".btn-group") as HTMLElement;
      if (parent) parent.style.display = "none";
    });
  });

  await page.waitForTimeout(1000);
}

async function scrollToLoadAll(page: Page): Promise<void> {
  const scrollTotal = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < scrollTotal; y += 300) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(100);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(2000);
}

async function captureAsPdf(page: Page): Promise<Buffer> {
  const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportHeight = 900;
  const screenshots: Buffer[] = [];

  for (let scrollY = 0; scrollY < totalHeight; scrollY += viewportHeight) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(300);
    screenshots.push(await page.screenshot({ type: "png" }));
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    for (const shot of screenshots) {
      const dims = imageSize(shot);
      if (!dims.width || !dims.height) continue;

      const pdfWidth = 595.28;
      const pdfHeight = (dims.height / dims.width) * pdfWidth;

      doc.addPage({ size: [pdfWidth, pdfHeight], margin: 0 });
      doc.image(shot, 0, 0, { width: pdfWidth });
    }

    doc.end();
  });
}
