'use strict';

// Remove tudo que não for dígito.
function onlyDigits(str) {
  return (str || '').replace(/\D+/g, '');
}

/**
 * Valida CPF com cálculo de dígitos verificadores.
 * Aceita com ou sem máscara (XXX.XXX.XXX-XX ou apenas dígitos).
 */
function validateCPF(cpf) {
  const d = onlyDigits(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false; // todos dígitos iguais (ex: 111.111.111-11)

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i], 10) * (10 - i);
  let dv1 = 11 - (sum % 11);
  if (dv1 >= 10) dv1 = 0;
  if (dv1 !== parseInt(d[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i], 10) * (11 - i);
  let dv2 = 11 - (sum % 11);
  if (dv2 >= 10) dv2 = 0;
  return dv2 === parseInt(d[10], 10);
}

/**
 * Valida CNPJ com cálculo de dígitos verificadores.
 * Aceita com ou sem máscara (XX.XXX.XXX/XXXX-XX ou apenas dígitos).
 */
function validateCNPJ(cnpj) {
  const d = onlyDigits(cnpj);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false; // todos dígitos iguais

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(d[i], 10) * weights1[i];
  let dv1 = sum % 11;
  dv1 = dv1 < 2 ? 0 : 11 - dv1;
  if (dv1 !== parseInt(d[12], 10)) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(d[i], 10) * weights2[i];
  let dv2 = sum % 11;
  dv2 = dv2 < 2 ? 0 : 11 - dv2;
  return dv2 === parseInt(d[13], 10);
}

/**
 * Valida telefone brasileiro (fixo 10 dígitos ou celular 11 dígitos).
 * Aceita com ou sem máscara.
 */
function validatePhone(phone) {
  const d = onlyDigits(phone);
  if (d.length !== 10 && d.length !== 11) return false;
  // Celular: 11 dígitos, terceiro dígito deve ser 9
  if (d.length === 11 && d[2] !== '9') return false;
  const ddd = parseInt(d.slice(0, 2), 10);
  // DDDs válidos no Brasil começam em 11
  if (ddd < 11 || ddd > 99) return false;
  return true;
}

/**
 * Valida formato básico de e-mail.
 * Validação completa (MX lookup, etc.) é responsabilidade do back-end transacional.
 */
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return re.test(email);
}

module.exports = { validateCPF, validateCNPJ, validatePhone, validateEmail, onlyDigits };
