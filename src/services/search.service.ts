import axios from "axios";
import { logger } from "../utils/logger.js";

interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export async function webSearch(query: string, count = 5): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    logger.warn("Brave Search API key not configured, returning empty results");
    return [];
  }

  try {
    const { data } = await axios.get("https://api.search.brave.com/res/v1/web/search", {
      params: { q: query, count },
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
      timeout: 10000,
    });

    return (data.web?.results || []).map(
      (r: { title: string; url: string; description: string }) => ({
        title: r.title,
        url: r.url,
        description: r.description,
      })
    );
  } catch (error) {
    logger.error({ error }, "Web search failed");
    return [];
  }
}
