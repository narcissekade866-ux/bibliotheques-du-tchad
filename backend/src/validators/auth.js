const { z } = require('zod');

const COMMON_PASSWORDS = new Set([
  'password', '12345678', '123456789', '1234567890', 'qwerty123',
  'abcdefgh', 'motdepasse', 'azerty123', 'password1', '00000000',
]);

const registerSchema = z.object({
  nom: z.string().min(2).max(200),
  email: z.string().email().max(254),
  telephone: z.string().max(30).optional(),
  mot_de_passe: z
    .string()
    .min(8)
    .max(128)
    .refine((val) => !COMMON_PASSWORDS.has(val.toLowerCase()), {
      message: 'Ce mot de passe est trop courant',
    }),
});

const loginSchema = z.object({
  email: z.string().email().max(254),
  mot_de_passe: z.string().min(1).max(128),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

module.exports = { registerSchema, loginSchema, refreshSchema };
