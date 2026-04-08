export const sanitizeYoutubeVideoTitle = (title: string) => {
  const normalizedTitle = title.trim();
  return normalizedTitle.replace(/^\(.+?\)/, "").replace(/- youtube$/i, "").trim();
};
