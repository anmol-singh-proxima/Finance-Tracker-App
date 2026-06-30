const isDevelopment = process.env.NODE_ENV === 'development';

const formatLog = (level, data) => {
  const timestamp = new Date().toISOString();
  return {
    timestamp,
    level,
    ...data,
  };
};

export const logger = {
  info: (data) => {
    console.log(JSON.stringify(formatLog('INFO', data)));
  },
  error: (data) => {
    console.error(JSON.stringify(formatLog('ERROR', data)));
  },
  warn: (data) => {
    console.warn(JSON.stringify(formatLog('WARN', data)));
  },
  debug: (data) => {
    if (isDevelopment) {
      console.log(JSON.stringify(formatLog('DEBUG', data)));
    }
  },
};
