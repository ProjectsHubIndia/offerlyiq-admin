import * as yup from "yup";

export const loginSchema = yup.object({
  email: yup
    .string()
    .email("Enter a valid email address")
    .required("Email is required"),
  password: yup.string().required("Password is required"),
});

export const profileSettingsSchema = yup.object({
  full_name: yup.string().trim().required("Full name is required"),
});

export const careerRecommendationsSchema = yup.object({
  target_role: yup.string().trim(),
  job_description: yup.string().trim(),
});

export const prepPackSchema = yup.object({
  target_role: yup.string().trim(),
  company: yup.string().trim(),
  job_description: yup.string().trim(),
});

export const resumeTailorSchema = yup.object({
  role: yup.string().trim().required("Job role is required"),
  job_description: yup.string().trim().required("Job description is required"),
});

export const jdMatchSchema = yup.object({
  job_description: yup.string().trim().required("Job description is required"),
});

export const sessionSetupSchema = yup.object({
  title: yup.string().trim().required("Session title is required"),
  role: yup.string().trim().required("Target role is required"),
});
