import { Injectable } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsFilterDto } from './dto/reports-filter.dto';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

@Injectable()
export class ReportsExportService {
  constructor(private readonly reportsService: ReportsService) {}

  async exportToCSV(
    tenantId: string,
    filters: ReportsFilterDto,
    res: Response,
  ): Promise<void> {
    const overview = await this.reportsService.getOverview(tenantId, filters);
    const leads = await this.reportsService.getLeads(tenantId, filters, 'day');
    const conversion = await this.reportsService.getConversion(tenantId, filters);
    const attendance = await this.reportsService.getAttendance(tenantId, filters);

    const csvLines: string[] = [];

    // Header
    csvLines.push('RELATÓRIO DE PERFORMANCE');
    csvLines.push(`Período: ${filters.startDate || 'Início'} até ${filters.endDate || 'Fim'}`);
    csvLines.push('');

    // Overview
    csvLines.push('MÉTRICAS GERAIS');
    csvLines.push('Métrica,Valor');
    csvLines.push(`Total de Leads,${overview.totalLeads}`);
    csvLines.push(`Convertidos,${overview.totalConverted}`);
    csvLines.push(`Taxa de Conversão,${overview.conversionRate}%`);
    csvLines.push(`Total de Atendimentos,${overview.totalAttendances}`);
    csvLines.push(`Total de Mensagens,${overview.totalMessages}`);
    csvLines.push(`Tempo Médio de Resposta,${overview.averageResponseTime} min`);
    csvLines.push(`Tempo Médio de Atendimento,${overview.averageAttendanceTime} min`);
    csvLines.push('');

    // Leads por Status
    csvLines.push('DISTRIBUIÇÃO POR STATUS');
    csvLines.push('Status,Quantidade,Percentual');
    leads.byStatus.forEach((item) => {
      csvLines.push(`${item.status},${item.count},${item.percentage}%`);
    });
    csvLines.push('');

    // Leads por Origem
    csvLines.push('DISTRIBUIÇÃO POR ORIGEM');
    csvLines.push('Origem,Quantidade,Percentual');
    leads.byOrigin.forEach((item) => {
      csvLines.push(`${item.origin},${item.count},${item.percentage}%`);
    });
    csvLines.push('');

    // Conversão por Atendente
    csvLines.push('CONVERSÃO POR ATENDENTE');
    csvLines.push('Atendente,Total Leads,Convertidos,Taxa de Conversão');
    conversion.byAttendant.forEach((item) => {
      csvLines.push(`${item.userName},${item.totalLeads},${item.convertedLeads},${item.conversionRate}%`);
    });
    csvLines.push('');

    // Leads por Período
    csvLines.push('LEADS POR PERÍODO');
    csvLines.push('Data,Total,Convertidos');
    leads.byPeriod.forEach((item) => {
      csvLines.push(`${item.date},${item.count},${item.converted}`);
    });

    const csvContent = csvLines.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.send('\ufeff' + csvContent); // BOM para Excel reconhecer UTF-8
  }

  async exportToExcel(
    tenantId: string,
    filters: ReportsFilterDto,
    res: Response,
  ): Promise<void> {
    const overview = await this.reportsService.getOverview(tenantId, filters);
    const leads = await this.reportsService.getLeads(tenantId, filters, 'day');
    const conversion = await this.reportsService.getConversion(tenantId, filters);
    const attendance = await this.reportsService.getAttendance(tenantId, filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'B2X CRM';
    workbook.created = new Date();

    // Sheet 1: Overview
    const overviewSheet = workbook.addWorksheet('Métricas Gerais');
    overviewSheet.columns = [
      { header: 'Métrica', key: 'metric', width: 30 },
      { header: 'Valor', key: 'value', width: 20 },
    ];
    overviewSheet.addRows([
      { metric: 'Total de Leads', value: overview.totalLeads },
      { metric: 'Convertidos', value: overview.totalConverted },
      { metric: 'Taxa de Conversão', value: `${overview.conversionRate}%` },
      { metric: 'Total de Atendimentos', value: overview.totalAttendances },
      { metric: 'Total de Mensagens', value: overview.totalMessages },
      { metric: 'Tempo Médio de Resposta', value: `${overview.averageResponseTime} min` },
      { metric: 'Tempo Médio de Atendimento', value: `${overview.averageAttendanceTime} min` },
    ]);

    // Sheet 2: Leads por Status
    const statusSheet = workbook.addWorksheet('Leads por Status');
    statusSheet.columns = [
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Quantidade', key: 'count', width: 15 },
      { header: 'Percentual', key: 'percentage', width: 15 },
    ];
    statusSheet.addRows(leads.byStatus);

    // Sheet 3: Leads por Origem
    const originSheet = workbook.addWorksheet('Leads por Origem');
    originSheet.columns = [
      { header: 'Origem', key: 'origin', width: 20 },
      { header: 'Quantidade', key: 'count', width: 15 },
      { header: 'Percentual', key: 'percentage', width: 15 },
    ];
    originSheet.addRows(leads.byOrigin);

    // Sheet 4: Conversão por Atendente
    const conversionSheet = workbook.addWorksheet('Conversão por Atendente');
    conversionSheet.columns = [
      { header: 'Atendente', key: 'userName', width: 25 },
      { header: 'Total Leads', key: 'totalLeads', width: 15 },
      { header: 'Convertidos', key: 'convertedLeads', width: 15 },
      { header: 'Taxa de Conversão', key: 'conversionRate', width: 18 },
    ];
    conversionSheet.addRows(conversion.byAttendant);

    // Sheet 5: Leads por Período
    const periodSheet = workbook.addWorksheet('Leads por Período');
    periodSheet.columns = [
      { header: 'Data', key: 'date', width: 15 },
      { header: 'Total', key: 'count', width: 15 },
      { header: 'Convertidos', key: 'converted', width: 15 },
    ];
    periodSheet.addRows(leads.byPeriod);

    // Aplicar formatação
    [overviewSheet, statusSheet, originSheet, conversionSheet, periodSheet].forEach((sheet) => {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-${new Date().toISOString().split('T')[0]}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}

