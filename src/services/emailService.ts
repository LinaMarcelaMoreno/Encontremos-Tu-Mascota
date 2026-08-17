// Email service for dispatching transactional alerts via Resend

export interface MatchEmailPayload {
  to: string;
  recipientName: string;
  recipientRole: 'DUEÑO' | 'RESCATISTA';
  petName: string;
  petSpecies: string;
  petColor: string;
  petCity: string;
  matchPetName: string;
  matchPetPhoto?: string;
  matchSector?: string;
  matchContactPhone: string;
  matchContactName: string;
  matchDetails?: string;
  matchPercentage: number;
}

export interface SendEmailResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// Get saved Resend API key (from localStorage, env, or admin setting)
export function getResendApiKey(): string {
  const customKey = localStorage.getItem('resend_api_key');
  if (customKey && customKey.trim().length > 0) {
    return customKey.trim();
  }
  // Default to empty or injected key
  return '';
}

export function setResendApiKey(key: string): void {
  if (key && key.trim().length > 0) {
    localStorage.setItem('resend_api_key', key.trim());
  } else {
    localStorage.removeItem('resend_api_key');
  }
}

/**
 * Generates rich HTML template for pet match alerts
 */
export function generateMatchEmailHtml(payload: MatchEmailPayload): string {
  const isOwner = payload.recipientRole === 'DUEÑO';
  const headerBg = isOwner ? '#dc2626' : '#059669';
  const badgeText = isOwner ? '🚨 ALERTA DE COINCIDENCIA' : '🐾 REPORTE DE APOYO';
  const appUrl = 'https://encontremostumascota.co';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Alerta de Coincidencia - Encontremos Tu Mascota</title>
  </head>
  <body style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
      
      <!-- Flag Accent -->
      <div style="display: flex; height: 6px; width: 100%;">
        <div style="background-color: #facc15; width: 50%; height: 6px;"></div>
        <div style="background-color: #2563eb; width: 25%; height: 6px;"></div>
        <div style="background-color: #dc2626; width: 25%; height: 6px;"></div>
      </div>

      <!-- Header -->
      <div style="background-color: #0f172a; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: bold;">
          🐾 Encontremos Tu Mascota Colombia
        </h1>
        <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">
          Red Solidaria de Búsqueda y Reencuentro Animal
        </p>
      </div>

      <!-- Main Notification Banner -->
      <div style="background-color: ${headerBg}; color: #ffffff; padding: 14px 20px; text-align: center;">
        <span style="font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
          ${badgeText} (${payload.matchPercentage}% de Coincidencia)
        </span>
      </div>

      <!-- Body Content -->
      <div style="padding: 24px;">
        <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
          Hola <strong>${payload.recipientName}</strong>,
        </p>
        
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          ${
            isOwner
              ? `Nuestro sistema de cruce automático ha detectado una mascota reportada como <strong>ENCONTRADA</strong> en <strong>${payload.petCity}</strong> que coincide con las características de tu peludo <strong>${payload.petName}</strong>.`
              : `Una familia en <strong>${payload.petCity}</strong> está buscando desesperadamente a su mascota con características muy similares a la que reportaste como encontrada.`
          }
        </p>

        <!-- Pet Match Card -->
        <div style="background-color: #f1f5f9; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #cbd5e1;">
          <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a;">
            📋 Datos de la Mascota Coincidente:
          </h3>
          
          ${renderPetPhotoForEmail(payload.matchPetPhoto, payload.petName, payload.petSpecies, appUrl)}

          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 38%;"><strong>Ciudad/Municipio:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${payload.petCity}</td>
            </tr>
            ${
              payload.matchSector
                ? `<tr>
                    <td style="padding: 6px 0; color: #64748b;"><strong>Sector / Barrio:</strong></td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${payload.matchSector}</td>
                  </tr>`
                : ''
            }
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Especie y Color:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${payload.petSpecies} - ${payload.petColor}</td>
            </tr>
            ${
              payload.matchDetails
                ? `<tr>
                    <td style="padding: 6px 0; color: #64748b;"><strong>Detalles:</strong></td>
                    <td style="padding: 6px 0; color: #0f172a;">${payload.matchDetails}</td>
                  </tr>`
                : ''
            }
          </table>

          <!-- Button to View on Website -->
          <div style="text-align: center; margin-top: 16px; padding-top: 14px; border-top: 1px solid #cbd5e1;">
            <a href="${appUrl}" target="_blank" 
               style="background-color: #1e3a8a; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: bold; display: inline-block;">
              🌐 Ver Reporte y Galería en la Plataforma
            </a>
          </div>
        </div>

        <!-- Contact Box -->
        <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
          <h4 style="margin: 0 0 8px 0; color: #854d0e; font-size: 14px;">
            📞 Contacto Directo:
          </h4>
          <p style="margin: 0; font-size: 16px; font-weight: bold; color: #0f172a;">
            ${payload.matchContactName || 'Contacto'}: <a href="tel:${payload.matchContactPhone || ''}" style="color: #2563eb; text-decoration: none;">${payload.matchContactPhone || 'No disponible'}</a>
          </p>
          <div style="margin-top: 12px;">
            <a href="https://wa.me/57${String(payload.matchContactPhone || '').replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(payload.matchContactName || '')},%20te%20escribo%20desde%20la%20Red%20Solidaria%20Encontremos%20Tu%20Mascota%20sobre%20la%20coincidencia%20en%20${encodeURIComponent(payload.petCity || '')}" 
               style="background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: bold; display: inline-block;">
              💬 Escribir por WhatsApp
            </a>
          </div>
        </div>

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 0;">
          Este correo fue generado automáticamente por la red comunitaria <a href="${appUrl}" style="color: #2563eb; text-decoration: none;">encontremostumascota.co</a> para facilitar el reencuentro de mascotas en Colombia.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
        © ${new Date().getFullYear()} Encontremos Tu Mascota Colombia • Red Solidaria Gratuita
      </div>
    </div>
  </body>
  </html>
  `;
}

export interface ConsolidatedMatchItem {
  lostPet: {
    nombre: string;
    especie: string;
    raza?: string;
    color: string;
    tamano: string;
    ciudad: string;
    departamento?: string;
    barrioSector?: string;
    fechaEvento?: string;
    fotoUrl?: string;
    contactoNombre: string;
    contactoTelefono: string;
    contactoCorreo?: string;
  };
  foundPet: {
    nombre: string;
    especie: string;
    raza?: string;
    color: string;
    tamano: string;
    ciudad: string;
    departamento?: string;
    barrioSector?: string;
    fechaEvento?: string;
    fotoUrl?: string;
    contactoNombre: string;
    contactoTelefono: string;
    contactoCorreo?: string;
    detalles?: string;
  };
  matchPercentage: number;
}

/**
 * Helper to render pet photo or web link safely in HTML emails
 */
function renderPetPhotoForEmail(fotoUrl: string | undefined, petName: string, species: string, appUrl: string): string {
  if (!fotoUrl) {
    return `
      <div style="background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px; text-align: center; margin-bottom: 8px;">
        <span style="font-size: 11px; color: #64748b;">🐾 Sin foto adjunta</span>
      </div>
    `;
  }

  // If it's a real HTTP/HTTPS URL, render standard <img>
  if (fotoUrl.startsWith('http://') || fotoUrl.startsWith('https://')) {
    return `
      <div style="text-align: center; margin-bottom: 8px;">
        <img src="${fotoUrl}" alt="${petName || species}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; display: block; margin: 0 auto;" />
        <div style="margin-top: 4px;">
          <a href="${fotoUrl}" target="_blank" style="color: #2563eb; font-size: 11px; text-decoration: underline; font-weight: bold;">🔍 Ver foto ampliada</a>
        </div>
      </div>
    `;
  }

  // If it's a data:image base64 string, do NOT embed raw base64 to avoid Gmail clipping (102KB limit)
  return `
    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; text-align: center; margin-bottom: 8px;">
      <p style="margin: 0 0 4px 0; font-size: 11px; color: #334155; font-weight: bold;">📷 Foto disponible en la plataforma</p>
      <a href="${appUrl}" target="_blank" style="color: #2563eb; font-size: 11px; text-decoration: underline; font-weight: bold;">Ver en encontremostumascota.co</a>
    </div>
  `;
}

/**
 * Generates a single consolidated Daily Digest email containing all pet matches
 * Designed with 100% email-client-compatible tables (Gmail, Outlook, iOS, Android)
 */
export function generateConsolidatedDailyDigestEmailHtml(
  recipientName: string,
  matches: ConsolidatedMatchItem[],
  dateFormatted?: string
): string {
  const appUrl = 'https://encontremostumascota.co';
  const displayDate =
    dateFormatted ||
    new Date().toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

  const matchesHtml = matches
    .map((match, index) => {
      const lost = match.lostPet;
      const found = match.foundPet;
      const scoreBadgeColor = match.matchPercentage >= 90 ? '#15803d' : '#b45309';

      const cleanPhone = String(found.contactoTelefono || lost.contactoTelefono || '').replace(/\D/g, '');
      const waLink = `https://wa.me/57${cleanPhone}?text=Hola%20${encodeURIComponent(
        found.contactoNombre || lost.contactoNombre || ''
      )},%20te%20escribo%20desde%20Encontremos%20Tu%20Mascota%20sobre%20la%20coincidencia%20en%20${encodeURIComponent(
        lost.ciudad || ''
      )}`;

      return `
      <!-- Match Item #${index + 1} -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden;">
        <!-- Header Row -->
        <tr>
          <td style="background-color: #0f172a; padding: 12px 16px; color: #ffffff;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size: 14px; font-weight: bold; color: #ffffff;">
                  🔍 Caso #${index + 1}: ${lost.ciudad || 'Colombia'} (${lost.especie})
                </td>
                <td align="right">
                  <span style="background-color: ${scoreBadgeColor}; color: #ffffff; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                    ${match.matchPercentage}% Coincidencia
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Content Body: 2 Columns Table (Lost vs Found) -->
        <tr>
          <td style="padding: 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <!-- COLUMN 1: LOST PET -->
                <td width="48%" valign="top" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px;">
                  <div style="background-color: #dc2626; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-align: center; margin-bottom: 10px; text-transform: uppercase;">
                    🔴 MASCOTA PERDIDA
                  </div>

                  ${renderPetPhotoForEmail(lost.fotoUrl, lost.nombre, lost.especie, appUrl)}

                  <table width="100%" cellpadding="2" cellspacing="0" border="0" style="font-size: 12px; color: #334155;">
                    <tr>
                      <td style="font-weight: bold; width: 35%; color: #64748b;">Nombre:</td>
                      <td style="font-weight: bold; color: #0f172a;">${lost.nombre || 'No indicado'}</td>
                    </tr>
                    ${lost.raza ? `<tr><td style="color: #64748b;">Raza:</td><td><strong>${lost.raza}</strong></td></tr>` : ''}
                    <tr>
                      <td style="color: #64748b;">Color:</td>
                      <td>${lost.color}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b;">Tamaño:</td>
                      <td>${lost.tamano}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b;">Sector:</td>
                      <td>${lost.barrioSector || 'No especificado'}</td>
                    </tr>
                    ${lost.fechaEvento ? `<tr><td style="color: #64748b;">Fecha pérdida:</td><td>${lost.fechaEvento}</td></tr>` : ''}
                    <tr>
                      <td colspan="2" style="padding-top: 8px; border-top: 1px dashed #fca5a5; font-size: 11px;">
                        <strong>Dueño:</strong> ${lost.contactoNombre || 'Familia'}<br/>
                        📞 <a href="tel:${lost.contactoTelefono || ''}" style="color: #2563eb; text-decoration: none; font-weight: bold;">${lost.contactoTelefono || 'No disponible'}</a>
                      </td>
                    </tr>
                  </table>
                </td>

                <!-- GAP -->
                <td width="4%"></td>

                <!-- COLUMN 2: FOUND PET -->
                <td width="48%" valign="top" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px;">
                  <div style="background-color: #16a34a; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-align: center; margin-bottom: 10px; text-transform: uppercase;">
                    🟢 MASCOTA ENCONTRADA
                  </div>

                  ${renderPetPhotoForEmail(found.fotoUrl, found.nombre, found.especie, appUrl)}

                  <table width="100%" cellpadding="2" cellspacing="0" border="0" style="font-size: 12px; color: #334155;">
                    <tr>
                      <td style="font-weight: bold; width: 35%; color: #64748b;">Reportado:</td>
                      <td style="font-weight: bold; color: #0f172a;">${found.nombre || 'Encontrado'}</td>
                    </tr>
                    ${found.raza ? `<tr><td style="color: #64748b;">Raza aprox:</td><td><strong>${found.raza}</strong></td></tr>` : ''}
                    <tr>
                      <td style="color: #64748b;">Color:</td>
                      <td>${found.color}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b;">Tamaño:</td>
                      <td>${found.tamano}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b;">Sector:</td>
                      <td>${found.barrioSector || 'No especificado'}</td>
                    </tr>
                    ${found.fechaEvento ? `<tr><td style="color: #64748b;">Fecha hallazgo:</td><td>${found.fechaEvento}</td></tr>` : ''}
                    <tr>
                      <td colspan="2" style="padding-top: 8px; border-top: 1px dashed #86efac; font-size: 11px;">
                        <strong>Rescatista:</strong> ${found.contactoNombre || 'Rescatista'}<br/>
                        📞 <a href="tel:${found.contactoTelefono || ''}" style="color: #2563eb; text-decoration: none; font-weight: bold;">${found.contactoTelefono || 'No disponible'}</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Contact & WhatsApp Action -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 12px;">
              <tr>
                <td align="center" style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 8px 12px;">
                  <a href="${waLink}" target="_blank" style="background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 7px 16px; border-radius: 6px; font-size: 12px; font-weight: bold; display: inline-block;">
                    💬 Conectar por WhatsApp (${cleanPhone || 'Contactar'})
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      `;
    })
    .join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resumen Diario de Coincidencias - Encontremos Tu Mascota</title>
  </head>
  <body style="font-family: Arial, Helvetica, sans-serif; background-color: #f1f5f9; margin: 0; padding: 15px; color: #1e293b;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 640px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #cbd5e1;">
            
            <!-- Flag Stripe -->
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="height: 6px;">
                  <tr>
                    <td width="50%" style="background-color: #facc15; height: 6px;"></td>
                    <td width="25%" style="background-color: #2563eb; height: 6px;"></td>
                    <td width="25%" style="background-color: #dc2626; height: 6px;"></td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Header -->
            <tr>
              <td style="background-color: #0f172a; padding: 22px 16px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: bold;">
                  🐾 Encontremos Tu Mascota Colombia
                </h1>
                <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">
                  Resumen Consolidado Diario • 6:00 AM
                </p>
              </td>
            </tr>

            <!-- Blue Banner -->
            <tr>
              <td style="background-color: #2563eb; color: #ffffff; padding: 12px 16px; text-align: center; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                📊 ${matches.length} COINCIDENCIA(S) DETECTADA(S) EN COLOMBIA
              </td>
            </tr>

            <!-- Body Intro -->
            <tr>
              <td style="padding: 20px 16px 10px 16px;">
                <p style="font-size: 14px; margin: 0 0 10px 0;">
                  Hola <strong>${recipientName}</strong>,
                </p>
                <p style="font-size: 13px; color: #475569; margin: 0 0 16px 0; line-height: 1.5;">
                  A continuación tienes el listado con <strong>todos los ${matches.length} casos coincidentes</strong> entre mascotas perdidas y encontradas para hoy <em>${displayDate}</em>:
                </p>

                <!-- List of matches -->
                ${matchesHtml}

                <!-- Platform button -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0 10px 0;">
                  <tr>
                    <td align="center">
                      <a href="${appUrl}" target="_blank" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 13px; font-weight: bold; display: inline-block;">
                        🌐 Abrir Plataforma (encontremostumascota.co)
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 15px 0 0 0;">
                  Generado automáticamente por la red solidaria de <a href="${appUrl}" style="color: #2563eb; text-decoration: none;">encontremostumascota.co</a>.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; padding: 14px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
                © ${new Date().getFullYear()} Encontremos Tu Mascota Colombia • Red Gratuita y Solidaria
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

/**
 * Sends a single email via Resend
 */
export async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string,
  apiKeyOverride?: string
): Promise<SendEmailResult> {
  const apiKey = (apiKeyOverride || getResendApiKey() || '').trim();

  // Try backend proxy first if running locally
  try {
    const backendRes = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html })
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      if (!data.simulated) {
        return {
          success: true,
          message: `Correo enviado exitosamente a ${to}`,
          data
        };
      }
    }
  } catch (e) {
    // If backend endpoint is not reachable (e.g. static on Netlify), try direct Resend API
  }

  // If no API key provided at all
  if (!apiKey) {
    return {
      success: false,
      message: 'No se ha configurado la clave API de Resend (RESEND_API_KEY).',
      error: 'MISSING_API_KEY'
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Encontremos Tu Mascota <alertas@encontremostumascota.co>',
        to: [to],
        subject,
        html
      })
    });

    const resData = await response.json();

    if (!response.ok) {
      const errDetail = resData?.message || JSON.stringify(resData);
      return {
        success: false,
        message: `Resend error: ${errDetail}`,
        error: errDetail
      };
    }

    return {
      success: true,
      message: `¡Correo enviado exitosamente a ${to}!`,
      data: resData
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Fallo de conexión al enviar correo: ${err.message || err}`,
      error: err.message || String(err)
    };
  }
}
