import { describe, expect, it } from "vitest";

import { toDirectDownloadUrl } from "@/lib/pdf/send-pdf-from-url";

describe("toDirectDownloadUrl", () => {
  it("converte link de compartilhamento /file/d/ do Drive em download direto", () => {
    const shared = "https://drive.google.com/file/d/1AbC_dEf123/view?usp=sharing";
    expect(toDirectDownloadUrl(shared)).toBe(
      "https://drive.google.com/uc?export=download&id=1AbC_dEf123"
    );
  });

  it("converte link /open?id= do Drive em download direto", () => {
    const open = "https://drive.google.com/open?id=XYZ789";
    expect(toDirectDownloadUrl(open)).toBe("https://drive.google.com/uc?export=download&id=XYZ789");
  });

  it("mantém URLs diretas de PDF inalteradas", () => {
    const direct = "https://meusite.com/arquivos/previa.pdf";
    expect(toDirectDownloadUrl(direct)).toBe(direct);
  });
});
