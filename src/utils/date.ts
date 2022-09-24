//https://gist.github.com/ntuaha/f4b16ad377505a8519c7#file-getdatestring_es6-js
const pad = (v: number) => {
  return v < 10 ? "0" + v : v.toString();
};

const getDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hour = pad(d.getHours());
  const min = pad(d.getMinutes());
  const sec = pad(d.getSeconds());
  //YYYYMMDDhhmmss
  return year + month + day + hour + min + sec;
};

export const getCurrentTimestamp = () => {
  const timeElapsed = Date.now();
  const today = new Date(timeElapsed);
  return getDateString(today);
};

export const getHourMinuteSecond = (
  duration: number,
  isSecondWithLeadingZero: boolean
) => {
  if (duration === NaN) {
    return [0, 0, 0];
  }

  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor(duration / 60) % 60;
  const seconds = duration % 60;
  if (isSecondWithLeadingZero) {
    const secondsWithLeadingZero = pad(seconds);

    return [hours, minutes, secondsWithLeadingZero];
  } else {
    return [hours, minutes, seconds];
  }
};

export const formatPlayerTime = (duration: number) => {
  const [hours, minutes, seconds] = getHourMinuteSecond(duration, true);
  if (hours === 0) {
    return `${minutes}:${seconds}`;
  } else {
    return `${hours}:${minutes}:${seconds}`;
  }
};
