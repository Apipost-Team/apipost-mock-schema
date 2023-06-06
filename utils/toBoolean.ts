type ConvertData = string | 1 | 0 | boolean;
export const convertToBoolean = (value: ConvertData) => {
  if (typeof value === 'string') {
    if (value.trim() === 'true') {
      return true;
    } else if (value.trim() === 'false') {
      return false;
    }
  } else if (typeof value === 'number') {
    if (value === 1) {
      return true;
    } else if (value === 0) {
      return false;
    }
  } else if (typeof value === 'boolean') {
    return value;
  }
  return null
};
