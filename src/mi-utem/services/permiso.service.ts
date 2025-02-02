import axios, { AxiosResponse } from "axios";
import FormData from "form-data";
import moment from "moment";
import pdf from "pdf-parse";
import { Page, Request, SetCookie } from "puppeteer";
import { browser } from "../../app";
import Permiso from "../../core/models/permiso.model";
import GenericError from "../../infrastructure/models/error.model";

export class MiUtemPermisoService {
  public static async getSolicitudesDisponibles(
    cookies: SetCookie[]
  ): Promise<Permiso[]> {
    const page: Page = await browser.newPage();
    try {
      const csrfmiddlewaretokenInputSel: string =
        "input[name='csrfmiddlewaretoken']";

      await page.setRequestInterception(true);
      page.on("request", (request: Request) => {
        if (
          ["image", "stylesheet", "font", "other", "xhr", "script"].includes(
            request.resourceType()
          )
        ) {
          request.abort();
        } else {
          request.continue();
        }
      });

      await page.setCookie(...cookies);
      await page.goto(`${process.env.MI_UTEM_URL}`, {
        waitUntil: "networkidle2",
      });

      try {
        await page.waitForSelector(csrfmiddlewaretokenInputSel, {
          timeout: 5000,
        });
      } catch (error) {
        const url = await page.url();
        if (url.startsWith(`${process.env.MI_UTEM_URL}`)) {
          throw error;
        } else {
          throw GenericError.MI_UTEM_EXPIRO;
        }
      }

      const csrfmiddlewaretoken: string = await page.evaluate(() => {
        const csrfmiddlewaretokenInputSel = "input[name='csrfmiddlewaretoken']";

        const csrfmiddlewaretoken = document
          .querySelector(csrfmiddlewaretokenInputSel)
          .getAttribute("value");

        return csrfmiddlewaretoken;
      });

      const sessionId: string = cookies.find(
        (e) => e.name == "sessionid"
      ).value;
      const csrfToken: string = cookies.find(
        (e) => e.name == "csrftoken"
      ).value;

      const formData = new FormData();
      formData.append("csrfmiddlewaretoken", csrfmiddlewaretoken);
      formData.append("tipo_envio", "1");

      let res: AxiosResponse = await axios.post(
        `${process.env.MI_UTEM_URL}/solicitudes/solicitudes_ingreso`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            ...{
              "X-Requested-With": "XMLHttpRequest",
              Host: "mi.utem.cl",
              Cookie: `MIUTEM=miutem1; csrftoken=${csrfToken}; sessionid=${sessionId}`,
            },
          },
        }
      );

      const html = res.data.html;

      page.setContent(html);

      const permisos: any[] = await page.evaluate(() => {
        const permisoDivSel: string = "#btn-mdl-notas";
        const permisosEl: Element[] = Array.from(
          document.querySelectorAll(permisoDivSel)
        );
        return permisosEl.map((permisoEl: Element) => {
          const tituloSel: string = "div:nth-child(1) > div > span";
          const descripcionSel: string = "div:nth-child(2) > div > span";
          const buttonSel: string = "button";

          const titulo: string = permisoEl
            .querySelector(tituloSel)
            .textContent.trim();
          const descripcion: string = permisoEl
            .querySelector(descripcionSel)
            .textContent.trim();

          const id: string =
            permisoEl.querySelector(buttonSel)?.getAttribute("token") ?? null;

          return {
            id,
            titulo,
            descripcion,
            solicitado: id != null,
          };
        });
      });

      return permisos;
    } catch (error) {
      throw error;
    } finally {
      page.close();
    }
  }

  public static async getPermisos(cookies: SetCookie[]): Promise<Permiso[]> {
    const page: Page = await browser.newPage();
    try {
      const csrfmiddlewaretokenInputSel: string =
        "input[name='csrfmiddlewaretoken']";

      await page.setRequestInterception(true);
      page.on("request", (request: Request) => {
        if (
          ["image", "stylesheet", "font", "other", "xhr", "script"].includes(
            request.resourceType()
          )
        ) {
          request.abort();
        } else {
          request.continue();
        }
      });

      await page.setCookie(...cookies);
      await page.goto(`${process.env.MI_UTEM_URL}`, {
        waitUntil: "networkidle2",
      });

      try {
        await page.waitForSelector(csrfmiddlewaretokenInputSel, {
          timeout: 5000,
        });
      } catch (error) {
        const url = await page.url();
        if (url.startsWith(`${process.env.MI_UTEM_URL}`)) {
          throw error;
        } else {
          throw GenericError.MI_UTEM_EXPIRO;
        }
      }

      const csrfmiddlewaretoken: string = await page.evaluate(() => {
        const csrfmiddlewaretokenInputSel = "input[name='csrfmiddlewaretoken']";

        const csrfmiddlewaretoken = document
          .querySelector(csrfmiddlewaretokenInputSel)
          .getAttribute("value");

        return csrfmiddlewaretoken;
      });

      const sessionId: string = cookies.find(
        (e) => e.name == "sessionid"
      ).value;
      const csrfToken: string = cookies.find(
        (e) => e.name == "csrftoken"
      ).value;

      const formData = new FormData();
      formData.append("csrfmiddlewaretoken", csrfmiddlewaretoken);
      formData.append("tipo_envio", "4");

      let res: AxiosResponse = await axios.post(
        `${process.env.MI_UTEM_URL}/solicitudes/solicitudes_ingreso`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            ...{
              "X-Requested-With": "XMLHttpRequest",
              Host: "mi.utem.cl",
              Cookie: `MIUTEM=miutem1; csrftoken=${csrfToken}; sessionid=${sessionId}`,
            },
          },
        }
      );

      const permisosJson: any[] = res.data.data;

      const permisos: Permiso[] = permisosJson.map((permisoJson: any) => {
        return {
          id: permisoJson.btn_descarga.split("token=")[1].split("=")[0] + "=",
          perfil: permisoJson.tipo,
          motivo: permisoJson.motivo,
          campus:
            permisoJson.campus != "-" ? permisoJson.campus.toTitleCase() : null,
          dependencia:
            permisoJson.edificio != "-"
              ? permisoJson.edificio.toTitleCase()
              : null,
          jornada: permisoJson.jornada,
          fechaSolicitud: moment(
            permisoJson.fecha_solicitud,
            "DD-MM-YYYY"
          ).toDate(),
        };
      });

      return permisos;
    } catch (error) {
      throw error;
    } finally {
      page.close();
    }
  }

  public static async getDetallePermiso(
    cookies: SetCookie[],
    permisoId: string
  ): Promise<Permiso> {
    const page: Page = await browser.newPage();
    try {
      const csrfmiddlewaretokenInputSel: string =
        "input[name='csrfmiddlewaretoken']";

      await page.setRequestInterception(true);
      page.on("request", (request: Request) => {
        if (
          ["image", "stylesheet", "font", "other", "xhr", "script"].includes(
            request.resourceType()
          )
        ) {
          request.abort();
        } else {
          request.continue();
        }
      });

      await page.setCookie(...cookies);
      await page.goto(`${process.env.MI_UTEM_URL}`, {
        waitUntil: "networkidle2",
      });

      try {
        await page.waitForSelector(csrfmiddlewaretokenInputSel, {
          timeout: 5000,
        });
      } catch (error) {
        const url = await page.url();
        if (url.startsWith(`${process.env.MI_UTEM_URL}`)) {
          throw error;
        } else {
          throw GenericError.MI_UTEM_EXPIRO;
        }
      }

      const csrfmiddlewaretoken: string = await page.evaluate(() => {
        const csrfmiddlewaretokenInputSel = "input[name='csrfmiddlewaretoken']";

        const csrfmiddlewaretoken = document
          .querySelector(csrfmiddlewaretokenInputSel)
          .getAttribute("value");

        return csrfmiddlewaretoken;
      });

      const sessionId: string = cookies.find(
        (e) => e.name == "sessionid"
      ).value;
      const csrfToken: string = cookies.find(
        (e) => e.name == "csrftoken"
      ).value;

      const formData = new FormData();
      formData.append("csrfmiddlewaretoken", csrfmiddlewaretoken);
      formData.append("tipo_envio", "5");
      formData.append("solicitud", permisoId);

      let res: AxiosResponse = await axios.post(
        `${process.env.MI_UTEM_URL}/solicitudes/solicitudes_ingreso`,
        formData,

        {
          responseType: "arraybuffer",
          headers: {
            ...formData.getHeaders(),
            ...{
              "X-Requested-With": "XMLHttpRequest",
              Host: "mi.utem.cl",
              Cookie: `MIUTEM=miutem1; csrftoken=${csrfToken}; sessionid=${sessionId}`,
            },
          },
        }
      );

      const dataString = res.data.toString().trim();
      if (
        dataString == "" ||
        dataString == "[]" ||
        dataString == "{}" ||
        dataString == "null"
      ) {
        throw GenericError.PERMISO_NO_ENCONTRADO;
      }

      const permiso: Permiso = await this.parsePermisoPdf(res.data, {
        withBase64File: true,
      });

      return permiso;
    } catch (error) {
      throw error;
    } finally {
      page.close();
    }
  }

  private static parsePermisoPdf(
    pdfBuffer: Buffer,
    options?: { withBase64File: boolean }
  ): Promise<Permiso> {
    return new Promise((resolve, reject) => {
      pdf(pdfBuffer)
        .then(function (data) {
          const lines: string[] = data.text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

          const nombreCompletoPreText: string = "Nombre completo";
          const nombreCompleto: string = lines
            .find((line) => line.startsWith(nombreCompletoPreText))
            ?.replace(nombreCompletoPreText, "")
            .trim()
            .toTitleCase();

          const rutPreText: string = "RUT";
          const rut: string = lines
            .find((line) => line.startsWith(rutPreText))
            ?.replace(rutPreText, "")
            .trim();

          const codigoValidacionPreText: string =
            "Para validar este documento debes ingresar ahttps://mi.utem.cl/validacione ingresar el código";
          const codigoValidacion: string = lines
            .find((line) => line.startsWith(codigoValidacionPreText))
            ?.replace(codigoValidacionPreText, "")
            .trim();

          const fechaSolicitudPreText: string = "Fecha de solicitud";
          const fechaSolicitudText: string = lines
            .find((line) => line.startsWith(fechaSolicitudPreText))
            ?.replace(fechaSolicitudPreText, "")
            .trim();
          const fechaSolicitud: Date = moment(
            fechaSolicitudText,
            "YYYY-MM-DD"
          ).toDate();

          const codigoQrPreLineText: string = "escanear el siguiente código QR";
          const codigoQrIndex: number =
            lines.findIndex((line) => line.includes(codigoQrPreLineText)) + 1;
          const codigoQr: string = lines[codigoQrIndex].trim();

          const jornadaPreText: string = "Jornada";
          const jornada: string = lines
            .find((line) => line.startsWith(jornadaPreText))
            ?.replace(jornadaPreText, "")
            .trim();

          const motivoPreText: string = "Motivo de solicitud";
          const motivo: string = lines
            .find((line) => line.startsWith(motivoPreText))
            ?.replace(motivoPreText, "")
            .trim();

          const codigoBarraPreText: string = "Codigo:";
          const codigoBarra: string = lines
            .find((line) => line.startsWith(codigoBarraPreText))
            ?.replace(codigoBarraPreText, "")
            .trim();

          const perfilPreText: string = "Perfil";
          const perfil: string = lines
            .find((line) => line.startsWith(perfilPreText))
            ?.replace(perfilPreText, "")
            .trim();

          const vigenciaPreText: string = "Vigencia del Permiso";
          let vigencia: string = lines
            .find((line) => line.startsWith(vigenciaPreText))
            ?.replace(vigenciaPreText, "")
            .trim();
          vigencia = vigencia != "-" ? vigencia : null;

          const campusPreText: string = "Campus";
          const campus: string =
            lines
              .find((line) => line.startsWith(campusPreText))
              ?.replace(campusPreText, "")
              .trim()
              .toTitleCase() ?? null;

          const dependenciaPreText: string = "Dependencia";
          const dependencia: string =
            lines
              .find((line) => line.startsWith(dependenciaPreText))
              ?.replace(dependenciaPreText, "")
              .trim()
              .toTitleCase() ?? null;

          const pdfBase64Object: any = options.withBase64File
            ? {
                pdfBase64:
                  "data:application/pdf;base64," + pdfBuffer.toString("base64"),
              }
            : {};

          resolve({
            ...{
              usuario: {
                nombreCompleto,
                rut,
              },
              codigoValidacion,
              fechaSolicitud,
              motivo,
              codigoQr,
              codigoBarra,
              jornada,
              perfil,
              vigencia,
              campus,
              dependencia,
            },
            ...pdfBase64Object,
          });
        })
        .catch(function (error) {
          reject(error);
        });
    });
  }
}
