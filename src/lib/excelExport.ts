import { PetRecord } from '../types';
import { formatPetColorDisplay } from '../data/colombiaData';

/**
 * Clean cell text for CSV / Excel formula escaping
 */
function cleanCsvValue(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates an orderly CSV string with UTF-8 BOM so Excel opens accents (ñ, tildes) perfectly
 */
export function generatePetsCsv(pets: PetRecord[]): string {
  const headers = [
    'ID Registro',
    'Tipo (PERDIDO/ENCONTRADO)',
    'Estado (ACTIVO/RESUELTO)',
    'Fecha de Registro',
    'Fecha del Suceso',
    'Nombre Mascota',
    'Especie',
    'Raza',
    'Color Principal',
    'Subcolores / Combinación',
    'Colores Completos',
    'Tamaño',
    'Departamento',
    'Municipio / Ciudad',
    'Barrio / Sector / Dirección',
    'Nombre de Contacto',
    'Teléfono Principal (WhatsApp)',
    'Teléfono Secundario',
    'Correo Electrónico',
    'Detalles / Observaciones',
    'Enlace Foto'
  ];

  const rows = pets.map((p) => [
    cleanCsvValue(p.id),
    cleanCsvValue(p.tipo),
    cleanCsvValue(p.estado),
    cleanCsvValue(p.fecha || ''),
    cleanCsvValue(p.fechaEvento || p.fecha || ''),
    cleanCsvValue(p.nombre || ''),
    cleanCsvValue(p.especie || ''),
    cleanCsvValue(p.raza || ''),
    cleanCsvValue(p.color || ''),
    cleanCsvValue(Array.isArray(p.subColores) ? p.subColores.join(' + ') : ''),
    cleanCsvValue(formatPetColorDisplay(p.color, p.subColores)),
    cleanCsvValue(p.tamano || ''),
    cleanCsvValue(p.departamento || ''),
    cleanCsvValue(p.ciudad || ''),
    cleanCsvValue(p.ubicacion || ''),
    cleanCsvValue(p.contacto || ''),
    cleanCsvValue(p.telefono || ''),
    cleanCsvValue(p.telefonoSecundario || ''),
    cleanCsvValue(p.correo || ''),
    cleanCsvValue(p.detalles || ''),
    cleanCsvValue(p.foto && p.foto.startsWith('http') ? p.foto : p.foto ? 'Foto en base64' : 'Sin foto')
  ]);

  const csvRows = [headers.map(cleanCsvValue).join(','), ...rows.map((r) => r.join(','))];
  // UTF-8 BOM \uFEFF ensures Excel displays Spanish characters like tildes and ñ correctly
  return '\uFEFF' + csvRows.join('\r\n');
}

/**
 * Downloads a generated CSV file
 */
export function downloadPetsCsv(pets: PetRecord[], filenamePrefix = 'mascotas_colombia'): void {
  const csvData = generatePetsCsv(pets);
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an XML-based Excel Spreadsheet (.xls / .xlsx compatible) with structured styling and headers
 */
export function generatePetsExcelXml(pets: PetRecord[]): string {
  const sanitizeXml = (val: any) => {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const headers = [
    'ID Registro',
    'Tipo',
    'Estado',
    'Fecha Registro',
    'Fecha Suceso',
    'Nombre Mascota',
    'Especie',
    'Raza',
    'Color Principal',
    'Subcolores',
    'Color Completo',
    'Tamaño',
    'Departamento',
    'Municipio / Ciudad',
    'Ubicación / Sector',
    'Nombre Contacto',
    'Teléfono Principal',
    'Teléfono Secundario',
    'Correo Electrónico',
    'Detalles',
    'Foto (URL/Estado)'
  ];

  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Perdido">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:Color="#991B1B" ss:Bold="1"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Encontrado">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:Color="#065F46" ss:Bold="1"/>
   <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Resuelto">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:Color="#1E40AF" ss:Bold="1"/>
   <Interior ss:Color="#DBEAFE" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Activo">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:Color="#166534" ss:Bold="1"/>
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Cell">
   <Alignment ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Mascotas Registradas">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="110"/>
   <Column ss:Width="90"/>
   <Column ss:Width="80"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="120"/>
   <Column ss:Width="70"/>
   <Column ss:Width="130"/>
   <Column ss:Width="90"/>
   <Column ss:Width="110"/>
   <Column ss:Width="130"/>
   <Column ss:Width="80"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="160"/>
   <Column ss:Width="130"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="140"/>
   <Column ss:Width="200"/>
   <Column ss:Width="100"/>
   <Row ss:Height="26">
`;

  headers.forEach((h) => {
    xml += `    <Cell ss:StyleID="Header"><Data ss:Type="String">${sanitizeXml(h)}</Data></Cell>\n`;
  });
  xml += `   </Row>\n`;

  pets.forEach((p) => {
    const isPerdido = p.tipo === 'PERDIDO';
    const isResuelto = p.estado === 'RESUELTO';

    xml += `   <Row ss:Height="22">
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(p.id)}</Data></Cell>
    <Cell ss:StyleID="${isPerdido ? 'Perdido' : 'Encontrado'}"><Data ss:Type="String">${sanitizeXml(p.tipo)}</Data></Cell>
    <Cell ss:StyleID="${isResuelto ? 'Resuelto' : 'Activo'}"><Data ss:Type="String">${sanitizeXml(p.estado)}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(p.fecha || '')}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(p.fechaEvento || p.fecha || '')}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(p.nombre || '')}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(p.especie || '')}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(p.raza || '')}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(p.color || '')}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(Array.isArray(p.subColores) ? p.subColores.join(' + ') : '')}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(formatPetColorDisplay(p.color, p.subColores))}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(p.tamano || '')}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(p.departamento || '')}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(p.ciudad || '')}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(p.ubicacion || '')}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(p.contacto || '')}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(p.telefono || '')}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(p.telefonoSecundario || '')}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(p.correo || '')}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(p.detalles || '')}</Data></Cell>
    <Cell ss:StyleID="Cell"><Data ss:Type="String">${sanitizeXml(p.foto && p.foto.startsWith('http') ? p.foto : p.foto ? 'Foto Registrada' : 'Sin Foto')}</Data></Cell>
   </Row>\n`;
  });

  xml += `  </Table>
 </Worksheet>
</Workbook>`;
  return xml;
}

/**
 * Downloads a generated Excel XML file (.xls)
 */
export function downloadPetsExcel(pets: PetRecord[], filenamePrefix = 'mascotas_colombia'): void {
  const xmlData = generatePetsExcelXml(pets);
  const blob = new Blob([xmlData], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
