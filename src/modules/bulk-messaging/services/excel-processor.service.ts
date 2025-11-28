import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface RecipientData {
  number: string;
  name?: string;
}

@Injectable()
export class ExcelProcessorService {
  private readonly logger = new Logger(ExcelProcessorService.name);

  /**
   * Processa arquivo Excel (XLS ou XLSX) e extrai lista de contatos
   * Espera colunas: "number" e "name" (opcional)
   */
  async processFile(file: Express.Multer.File): Promise<RecipientData[]> {
    if (!file) {
      throw new BadRequestException('Arquivo não fornecido');
    }

    const validMimeTypes = [
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
    ];

    if (!validMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato de arquivo inválido. Use XLS ou XLSX.',
      );
    }

    try {
      const workbook = new ExcelJS.Workbook();
      // Converter para Buffer nativo do Node.js
      // Converter para Buffer nativo do Node.js
      let buffer: Buffer;
      if (Buffer.isBuffer(file.buffer)) {
        buffer = file.buffer;
      } else {
        // Converter ArrayBuffer ou Uint8Array para Buffer
        const source = (file.buffer as any).buffer || file.buffer;
        buffer = Buffer.from(source);
      }
      // ExcelJS aceita Buffer, ArrayBuffer ou Uint8Array
      await workbook.xlsx.load(buffer as any);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new BadRequestException('Planilha vazia');
      }

      // Encontrar índices das colunas
      const headerRow = worksheet.getRow(1);
      let numberColIndex = -1;
      let nameColIndex = -1;

      headerRow.eachCell((cell, colNumber) => {
        const value = cell.value?.toString().toLowerCase().trim();
        if (value === 'number' || value === 'numero' || value === 'telefone' || value === 'phone') {
          numberColIndex = colNumber;
        }
        if (value === 'name' || value === 'nome') {
          nameColIndex = colNumber;
        }
      });

      if (numberColIndex === -1) {
        throw new BadRequestException(
          'Coluna "number" não encontrada. A planilha deve conter uma coluna "number" ou "numero".',
        );
      }

      const recipients: RecipientData[] = [];
      const errors: string[] = [];

      // Processar linhas (começando da linha 2, pulando o cabeçalho)
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const numberCell = row.getCell(numberColIndex);
        const nameCell = nameColIndex > 0 ? row.getCell(nameColIndex) : null;

        const numberValue = numberCell.value?.toString().trim();
        if (!numberValue) {
          continue; // Pular linhas vazias
        }

        // Normalizar número (remover caracteres não numéricos)
        const normalizedNumber = this.normalizePhoneNumber(numberValue);
        if (!normalizedNumber) {
          errors.push(`Linha ${rowNumber}: Número inválido "${numberValue}"`);
          continue;
        }

        const nameValue = nameCell?.value?.toString().trim() || undefined;

        recipients.push({
          number: normalizedNumber,
          name: nameValue,
        });
      }

      if (recipients.length === 0) {
        throw new BadRequestException(
          'Nenhum contato válido encontrado na planilha.',
        );
      }

      if (errors.length > 0) {
        this.logger.warn(
          `Processamento concluído com ${errors.length} erros: ${errors.slice(0, 5).join('; ')}`,
        );
      }

      this.logger.log(
        `Processados ${recipients.length} contatos do arquivo Excel`,
      );

      return recipients;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Erro ao processar arquivo Excel: ${error.message}`);
      throw new BadRequestException(
        `Erro ao processar arquivo: ${error.message}`,
      );
    }
  }

  /**
   * Normaliza número de telefone para formato WhatsApp
   * Remove caracteres não numéricos e valida formato
   */
  private normalizePhoneNumber(phone: string): string | null {
    // Remover todos os caracteres não numéricos
    const digits = phone.replace(/\D/g, '');

    // Validar tamanho mínimo (10 dígitos) e máximo (15 dígitos com código do país)
    if (digits.length < 10 || digits.length > 15) {
      return null;
    }

    // Se não começar com código do país, assumir Brasil (55)
    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`;
    }

    return digits;
  }
}

