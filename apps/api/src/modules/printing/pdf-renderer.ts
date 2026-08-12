import { Injectable } from "@nestjs/common";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

export const PDF_RENDERER = Symbol("PDF_RENDERER");

export interface PdfRenderer {
  render(html: string): Promise<Uint8Array>;
}

function browserCandidates() {
  const bundled = process.env.QUANTI_CHROMIUM_PATH?.trim();
  if (process.env.NODE_ENV === "production") return bundled ? [bundled] : [];
  return [
    bundled,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter((value): value is string => Boolean(value));
}

@Injectable()
export class PuppeteerPdfRenderer implements PdfRenderer {
  async render(html: string): Promise<Uint8Array> {
    const executablePath = browserCandidates().find(existsSync);

    if (!executablePath) {
      throw new Error(process.env.NODE_ENV === "production"
        ? "Bundled Quanti Chromium executable was not found."
        : "No supported Chromium executable was found. Configure QUANTI_CHROMIUM_PATH.");
    }

    const browser = await puppeteer.launch({
      executablePath,
      headless: true
    });

    try {
      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        if (request.url().startsWith("data:") || request.url().startsWith("about:")) {
          void request.continue();
          return;
        }

        void request.abort();
      });
      await page.setContent(html, { waitUntil: "domcontentloaded" });
      await page.evaluateHandle("document.fonts.ready");
      return await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true
      });
    } finally {
      await browser.close();
    }
  }
}
