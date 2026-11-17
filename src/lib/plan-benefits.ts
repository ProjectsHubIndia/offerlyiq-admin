export function parseApplicationBenefits(units: string, days: string) {
  const positiveInteger = (value: string, label: string, maximum: number) => {
    if (!value.trim()) return null;
    if (!/^\d+$/.test(value.trim()) || Number(value) < 1 || Number(value) > maximum) {
      throw new Error(`${label} must be a whole number from 1 to ${maximum}.`);
    }
    return Number(value);
  };
  const application_units = positiveInteger(units, "Included applications", 1000000);
  const application_validity_days = positiveInteger(days, "Application validity", 36500);
  if (application_units === null && application_validity_days !== null) {
    throw new Error("Set included applications before setting their validity.");
  }
  return { application_units, application_validity_days };
}
