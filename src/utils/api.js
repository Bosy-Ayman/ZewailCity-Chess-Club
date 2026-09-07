export const safeFetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Response is not valid JSON (e.g. HTML <!DOCTYPE... page)
    }
  }

  if (!res.ok) {
    const errorMsg = (data && (data.error || data.details || data.message)) || `Server returned status ${res.status}`;
    throw new Error(errorMsg);
  }

  if (data === null && (contentType.includes("html") || text.trim().startsWith("<"))) {
    throw new Error("Server returned HTML response instead of valid JSON.");
  }

  return data;
};

