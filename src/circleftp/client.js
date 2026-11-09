export class CircleFtpApiError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message, { cause });
    this.name = "CircleFtpApiError";
    this.status = status;
  }
}

export class CircleFtpClient {
  constructor({ baseUrl, timeoutMs = 15000, fetchImpl = fetch }) {
    this.baseUrl = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async request(path, query = {}) {
    const url = new URL(path.replace(/^\//, ""), this.baseUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    let response;
    try {
      response = await this.fetchImpl(url, {
        headers: {
          accept: "application/json",
          "user-agent": "CircleFTP-Nuvio-Addon/0.1"
        },
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (cause) {
      throw new CircleFtpApiError("Could not reach CircleFTP API", { cause });
    }

    if (!response.ok) {
      throw new CircleFtpApiError(`CircleFTP API returned HTTP ${response.status}`, {
        status: response.status
      });
    }

    try {
      return await response.json();
    } catch (cause) {
      throw new CircleFtpApiError("CircleFTP API returned invalid JSON", { cause });
    }
  }

  searchPosts(searchTerm, { page = 1, limit = 20, categoryExact } = {}) {
    return this.request("api/posts", {
      searchTerm,
      order: "desc",
      page,
      limit,
      categoryExact
    });
  }

  getPost(postId) {
    if (!/^\d+$/.test(String(postId))) {
      throw new TypeError("CircleFTP post ID must be numeric");
    }
    return this.request(`api/posts/${encodeURIComponent(postId)}`);
  }
}
