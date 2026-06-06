'use strict';

/**
 * Faz trim e remove caracteres de controle ASCII.
 * Retorna string vazia se o valor não for string.
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return '';
  // Remove caracteres de controle (0x00–0x1F e 0x7F) exceto tabs/newlines em textos livres
  return value.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Remove tudo que não for dígito (pontos, traços, barras etc.).
 * Usado para normalizar CPF, CNPJ antes de salvar no banco.
 */
function sanitizeDocument(doc) {
  if (typeof doc !== 'string') return '';
  return doc.replace(/\D+/g, '');
}

/**
 * Remove tudo que não for dígito.
 * Usado para normalizar telefone antes de salvar no banco.
 */
function sanitizePhone(phone) {
  if (typeof phone !== 'string') return '';
  return phone.replace(/\D+/g, '');
}

module.exports = { sanitizeString, sanitizeDocument, sanitizePhone };
