/**
 * Forever Codex — proxy JSONP para el catálogo de AHledger.
 * No guarda ni replica el catálogo: reenvía una categoría por petición.
 *
 * Para desplegar:
 * 1. Crear un proyecto en https://script.google.com/
 * 2. Pegar este archivo en Code.gs.
 * 3. Implementar > Nueva implementación > Aplicación web.
 * 4. Ejecutar como: Yo. Acceso: Cualquier usuario.
 * 5. Copiar la URL /exec y usarla como endpoint en Blogger.
 */
function doGet(e) {
  var params = (e && e.parameter) || {};
  var category = String(params.class || "trade-goods");
  var callback = String(params.callback || "");

  // Solo acepta categorías con caracteres simples; evita inyectar URLs.
  if (!/^[a-z-]{1,40}$/.test(category)) {
    return output_({ error: "Categoría no válida" }, callback);
  }

  // JSONP solo permite nombres de función simples o rutas como FC.receive.
  if (callback && !/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(callback)) {
    return ContentService.createTextOutput("Callback no válido")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  var url = "https://ahledger.com/api/catalog?class=" + encodeURIComponent(category);
  try {
    var response = UrlFetchApp.fetch(url, {
      method: "get",
      followRedirects: true,
      muteHttpExceptions: true,
      headers: { "Accept": "application/json" }
    });

    var status = response.getResponseCode();
    var body = response.getContentText();
    if (status < 200 || status >= 300) {
      return output_({ error: "AHledger devolvió HTTP " + status, category: category }, callback);
    }

    var data = JSON.parse(body);
    if (!data || !Array.isArray(data.rows)) {
      return output_({ error: "Formato de catálogo inesperado", category: category }, callback);
    }

    // Devuelve la respuesta de esa categoría en tiempo real, sin guardarla.
    return output_(data, callback);
  } catch (err) {
    return output_({ error: "No se pudo consultar AHledger", detail: String(err), category: category }, callback);
  }
}

function output_(data, callback) {
  var json = JSON.stringify(data);
  var content = callback ? callback + "(" + json + ");" : json;
  return ContentService.createTextOutput(content)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}
