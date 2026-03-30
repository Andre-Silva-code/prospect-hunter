/**
 * Script para login no GBP Check App usando cópia do perfil do Chrome real.
 *
 * Usa o Chrome real (não Chromium) para descriptografar cookies via Keychain.
 * Copia o perfil Default (alss.commerce@gmail.com) para .gbpcheck-browser/
 *
 * Uso: cd /Users/andresilva/prospect-hunter && npx tsx scripts/gbpcheck-login.ts
 */
import { chromium } from "playwright";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import * as readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const BROWSER_DATA_DIR = path.join(__dirname, "..", ".gbpcheck-browser");
export const AUTH_FILE = path.join(__dirname, "..", "gbpcheck-auth.json");

const CHROME_SOURCE = "/Users/andresilva/Library/Application Support/Google/Chrome";

async function waitForUser(message: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

function copyProfile() {
  console.log("Copiando perfil do Chrome para .gbpcheck-browser/ ...");

  // Remove cópia antiga
  if (fs.existsSync(BROWSER_DATA_DIR)) {
    fs.rmSync(BROWSER_DATA_DIR, { recursive: true });
  }
  fs.mkdirSync(BROWSER_DATA_DIR, { recursive: true });

  // Copia Local State (necessário para descriptografia)
  const localState = path.join(CHROME_SOURCE, "Local State");
  if (fs.existsSync(localState)) {
    fs.cpSync(localState, path.join(BROWSER_DATA_DIR, "Local State"));
    console.log("  + Local State");
  }

  // Copia o perfil Default inteiro para Default/
  const srcProfile = path.join(CHROME_SOURCE, "Default");
  const destProfile = path.join(BROWSER_DATA_DIR, "Default");
  fs.cpSync(srcProfile, destProfile, { recursive: true });
  console.log("  + Default (perfil completo)");

  console.log("Copia concluida!");
  console.log("");
}

async function main() {
  console.log("");
  console.log("=== GBP Check — Login com Chrome Real ===");
  console.log("");
  console.log("Perfil: Default (alss.commerce@gmail.com)");
  console.log("");

  // Fecha o Chrome
  console.log("Fechando o Chrome...");
  try {
    execSync("osascript -e 'quit app \"Google Chrome\"'", { stdio: "ignore" });
    await new Promise((r) => setTimeout(r, 3000));
  } catch {
    /* já fechado */
  }
  try {
    execSync('killall "Google Chrome"', { stdio: "ignore" });
    await new Promise((r) => setTimeout(r, 1000));
  } catch {
    /* já fechado */
  }
  console.log("Chrome fechado!");
  console.log("");

  // Copia o perfil
  copyProfile();

  console.log("Abrindo Chrome real com perfil copiado...");
  console.log("");

  const context = await chromium.launchPersistentContext(BROWSER_DATA_DIR, {
    headless: false,
    channel: "chrome",
    viewport: { width: 1280, height: 800 },
    args: ["--disable-blink-features=AutomationControlled", "--disable-extensions"],
    ignoreDefaultArgs: ["--enable-automation"],
  });

  const page = context.pages()[0] || (await context.newPage());
  await page.goto("https://app.gbpcheck.com/");

  console.log("===========================================");
  console.log("  O Chrome abriu com seu perfil copiado.");
  console.log("  Voce deve estar logado automaticamente.");
  console.log("  Se nao, faca login com Google usando");
  console.log("  l3amidiasdigitais@gmail.com");
  console.log("  Depois, volte AQUI no terminal.");
  console.log("===========================================");
  console.log("");

  await waitForUser(">>> Pressione ENTER quando estiver logado no dashboard: ");

  const url = page.url();
  console.log("URL atual:", url);

  // Salva sessão para automações futuras
  const storage = await context.storageState();
  fs.writeFileSync(AUTH_FILE, JSON.stringify(storage, null, 2));
  console.log("");
  console.log(`Sessao salva em: gbpcheck-auth.json`);

  await context.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
