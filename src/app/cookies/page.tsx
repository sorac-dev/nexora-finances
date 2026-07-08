"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/src/components/ui/icon";
import { useAppSettings } from "@/src/hooks/use-app-settings";

export default function CookiesPage() {
  const router = useRouter();
  const s = useAppSettings();
  return (
    <div style={{ width:"100%", minHeight:"100dvh", background:"var(--bg)", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 20px", borderBottom:"1px solid var(--glass-border)", flexShrink:0 }}>
        <div className="top-nav-btn" onClick={() => router.back()}><Icon name="ArrowLeft" size={18} /></div>
        <h1 style={{ fontSize:17, fontWeight:700, margin:0, color:"var(--text)" }}>Política de Cookies</h1>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 60px", color:"var(--text)", lineHeight:1.8, fontSize:14 }}>

        <p style={{ color:"var(--text-dim)", fontSize:12, marginBottom:24 }}>Última actualización: Julio de 2026</p>

        <h2 style={{ fontSize:18, fontWeight:700, marginTop:28, marginBottom:8 }}>1. ¿Qué son las Cookies?</h2>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>1.1. Las cookies son pequeños archivos de texto que los sitios web y aplicaciones almacenan en el dispositivo del usuario (computadora, tableta, teléfono móvil) cuando este los visita. Las cookies permiten que el sitio web recuerde información sobre la visita del usuario, como sus preferencias, el idioma seleccionado o el estado de inicio de sesión. Las cookies son ampliamente utilizadas en Internet para hacer que los sitios web funcionen de manera eficiente, así como para proporcionar información a los propietarios del sitio.</p>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>1.2. Las cookies pueden clasificarse según diversos criterios: (a) según la entidad que las gestiona: cookies propias (gestionadas por el propio sitio web) y cookies de terceros (gestionadas por servicios externos); (b) según su duración: cookies de sesión (se eliminan al cerrar el navegador) y cookies persistentes (permanecen en el dispositivo por un período determinado); (c) según su finalidad: cookies técnicas (necesarias para el funcionamiento), cookies de preferencias (guardan configuraciones), cookies de análisis (recopilan datos de uso), cookies publicitarias (muestran anuncios personalizados).</p>

        <h2 style={{ fontSize:18, fontWeight:700, marginTop:28, marginBottom:8 }}>2. Política de Cookies de {s.app_name}</h2>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>2.1. {s.app_name} ha adoptado una política de privacidad por diseño que minimiza al máximo el uso de cookies. Nuestra Plataforma utiliza ÚNICA Y EXCLUSIVAMENTE las cookies técnicas estrictamente necesarias para su funcionamiento. No utilizamos cookies de ningún otro tipo.</p>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>2.2. Esta política de cookies minimalista se fundamenta en nuestro compromiso con la privacidad de nuestros Usuarios y en el principio de minimización de datos establecido en la Ley 1581 de 2012 de la República de Colombia.</p>

        <h2 style={{ fontSize:18, fontWeight:700, marginTop:28, marginBottom:8 }}>3. Cookies que Utilizamos</h2>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>3.1. La Plataforma utiliza una única cookie técnica esencial:</p>

        <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid var(--glass-border)", borderRadius:16, padding:"16px", marginBottom:16 }}>
          <h3 style={{ fontSize:15, fontWeight:700, margin:"0 0 8px", color:"var(--c-blue)" }}>nexora.session_token</h3>
          <p style={{ color:"var(--text-dim)", margin:"0 0 4px" }}><strong>Tipo:</strong> Cookie propia, de sesión (persistente por 30 días o hasta cerrar sesión)</p>
          <p style={{ color:"var(--text-dim)", margin:"0 0 4px" }}><strong>Finalidad:</strong> Mantener la sesión del Usuario iniciada de forma segura. Esta cookie contiene un token único generado criptográficamente por Better Auth que identifica la sesión activa del Usuario en el servidor. Es procesada en cada solicitud HTTP para verificar la identidad del Usuario y autorizar o denegar el acceso a los recursos protegidos de la Plataforma.</p>
          <p style={{ color:"var(--text-dim)", margin:"0 0 4px" }}><strong>Atributos de seguridad:</strong> HttpOnly (no accesible mediante JavaScript, previniendo robo de sesión vía XSS), Secure (solo se transmite a través de conexiones HTTPS cifradas, nunca en texto plano), SameSite=Strict (no se envía en solicitudes iniciadas desde otros sitios web, previniendo ataques CSRF), Path=/ (aplica a toda la Plataforma).</p>
          <p style={{ color:"var(--text-dim)", margin:"0 0 4px" }}><strong>Duración:</strong> Treinta (30) días desde el último acceso, renovable automáticamente con cada uso de la Plataforma.</p>
          <p style={{ color:"var(--text-dim)", margin:0 }}><strong>Consecuencia de su desactivación:</strong> No será posible iniciar sesión ni utilizar las funcionalidades protegidas de la Plataforma.</p>
        </div>

        <h2 style={{ fontSize:18, fontWeight:700, marginTop:28, marginBottom:8 }}>4. Cookies que NO Utilizamos</h2>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>Para total transparencia del Usuario, declaramos expresamente que {s.app_name} NO utiliza en ningún caso:</p>
        <p style={{ color:"var(--text-dim)", marginBottom:6 }}>4.1. <strong>Cookies de publicidad comportamental:</strong> no rastreamos su actividad para mostrarle anuncios personalizados.</p>
        <p style={{ color:"var(--text-dim)", marginBottom:6 }}>4.2. <strong>Cookies de análisis o medición de audiencia:</strong> no utilizamos Google Analytics, Facebook Pixel, ni ninguna otra herramienta de análisis de terceros que instale cookies en su dispositivo.</p>
        <p style={{ color:"var(--text-dim)", marginBottom:6 }}>4.3. <strong>Cookies de redes sociales:</strong> no integramos botones "Me gusta", "Compartir" u otros widgets de redes sociales que instalen cookies de terceros.</p>
        <p style={{ color:"var(--text-dim)", marginBottom:6 }}>4.4. <strong>Cookies de sesión de terceros:</strong> ninguna funcionalidad de la Plataforma depende de cookies establecidas por servicios externos.</p>
        <p style={{ color:"var(--text-dim)", marginBottom:6 }}>4.5. <strong>Supercookies, zombie cookies o EVERCOOKIES:</strong> no utilizamos ningún mecanismo de almacenamiento persistente que no sea la única cookie de sesión descrita anteriormente.</p>
        <p style={{ color:"var(--text-dim)", marginBottom:6 }}>4.6. <strong>Huellas digitales del navegador (browser fingerprinting):</strong> no recolectamos características del navegador para identificar de manera única a los Usuarios sin su conocimiento.</p>
        <p style={{ color:"var(--text-dim)", marginBottom:6 }}>4.7. <strong>Píxeles de seguimiento o web beacons:</strong> no utilizamos imágenes invisibles ni etiquetas de seguimiento en nuestros correos electrónicos o páginas.</p>

        <h2 style={{ fontSize:18, fontWeight:700, marginTop:28, marginBottom:8 }}>5. Almacenamiento Local (LocalStorage y SessionStorage)</h2>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>5.1. Adicionalmente a la cookie de sesión, la Plataforma puede utilizar los mecanismos de almacenamiento del navegador LocalStorage y SessionStorage para los siguientes fines exclusivamente técnicos y no relacionados con rastreo: (a) almacenar la preferencia de tema de la interfaz (claro/oscuro) seleccionada por el Usuario; (b) almacenar el estado de la interfaz de usuario entre recargas de página (pestaña activa, filtros aplicados) para una experiencia de uso más fluida; (c) almacenar temporalmente datos no sensibles durante el uso de la Plataforma para reducir la necesidad de solicitudes repetidas al servidor.</p>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>5.2. El almacenamiento local NO contiene datos personales sensibles, tokens de sesión, ni información financiera del Usuario. Toda la información financiera se almacena exclusivamente en los servidores de {s.app_name} y se transmite únicamente a través de la API protegida por la cookie de sesión.</p>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>5.3. El Usuario puede borrar estos datos en cualquier momento desde la configuración de su navegador, sin que ello afecte el funcionamiento principal de la Plataforma (aunque puede requerir volver a seleccionar preferencias de interfaz).</p>

        <h2 style={{ fontSize:18, fontWeight:700, marginTop:28, marginBottom:8 }}>6. Base Legal para el Uso de Cookies</h2>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>6.1. De conformidad con la Ley 1581 de 2012 de Colombia y el Decreto 1377 de 2013, las cookies técnicas estrictamente necesarias para la prestación de un servicio solicitado expresamente por el Usuario no requieren el consentimiento previo del Usuario para su instalación. Su uso está amparado en la ejecución del contrato de servicios aceptado por el Usuario al registrarse en la Plataforma (los Términos y Condiciones).</p>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>6.2. Esta base legal es conforme con el principio de necesidad establecido en la legislación colombiana: sin la cookie de sesión, la Plataforma no podría autenticar al Usuario, distinguir sus datos de los de otros Usuarios, ni proteger su cuenta de accesos no autorizados.</p>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>6.3. En caso de que en el futuro {s.app_name} decidiera implementar cookies adicionales de cualquier tipo que requieran consentimiento, se solicitará el consentimiento previo, expreso e informado del Usuario antes de su instalación, de conformidad con la legislación aplicable.</p>

        <h2 style={{ fontSize:18, fontWeight:700, marginTop:28, marginBottom:8 }}>7. Gestión y Desactivación de Cookies</h2>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>7.1. El Usuario puede en cualquier momento gestionar, bloquear o eliminar las cookies instaladas en su dispositivo mediante la configuración de su navegador. A continuación se indican los enlaces a las instrucciones de los navegadores más comunes:</p>
        <p style={{ color:"var(--text-dim)", marginBottom:6 }}>• <strong>Google Chrome:</strong> Configuración → Privacidad y seguridad → Cookies y otros datos de sitios</p>
        <p style={{ color:"var(--text-dim)", marginBottom:6 }}>• <strong>Mozilla Firefox:</strong> Opciones → Privacidad y seguridad → Cookies y datos del sitio</p>
        <p style={{ color:"var(--text-dim)", marginBottom:6 }}>• <strong>Apple Safari:</strong> Preferencias → Privacidad → Cookies y datos de sitios web</p>
        <p style={{ color:"var(--text-dim)", marginBottom:6 }}>• <strong>Microsoft Edge:</strong> Configuración → Cookies y permisos del sitio → Cookies y datos almacenados</p>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>• <strong>Opera:</strong> Configuración → Privacidad y seguridad → Cookies</p>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>7.2. <strong>Advertencia importante:</strong> si el Usuario decide bloquear o eliminar la cookie de sesión de {s.app_name} (nexora.session_token), no podrá iniciar sesión ni utilizar las funcionalidades protegidas de la Plataforma. La cookie de sesión es técnicamente indispensable para el funcionamiento del servicio. {s.app_name} no se hace responsable por la imposibilidad de utilizar la Plataforma derivada de la desactivación de cookies por parte del Usuario.</p>

        <h2 style={{ fontSize:18, fontWeight:700, marginTop:28, marginBottom:8 }}>8. Cookies en Dispositivos Móviles (PWA)</h2>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>8.1. Cuando la Plataforma se instala como Aplicación Web Progresiva (PWA) en un dispositivo móvil, el sistema operativo puede gestionar las cookies de manera diferente a un navegador tradicional. En general, las PWAs instaladas heredan la configuración de cookies del navegador que se utilizó para instalarlas.</p>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>8.2. El Usuario puede gestionar los datos de la PWA instalada desde los ajustes de aplicaciones de su dispositivo móvil, donde normalmente encontrará opciones para borrar datos de navegación, caché y cookies asociados a la aplicación.</p>

        <h2 style={{ fontSize:18, fontWeight:700, marginTop:28, marginBottom:8 }}>9. Cambios en la Política de Cookies</h2>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>9.1. {s.app_name} se reserva el derecho de modificar esta Política de Cookies en cualquier momento. Cualquier modificación entrará en vigor desde el momento de su publicación en la Plataforma.</p>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>9.2. En caso de que {s.app_name} decida implementar cookies adicionales en el futuro que requieran consentimiento del Usuario, se notificará a los Usuarios con al menos quince (15) días de antelación mediante un aviso destacado en la Plataforma y se solicitará el consentimiento correspondiente antes de la instalación de dichas cookies.</p>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>9.3. El uso continuado de la Plataforma después de la entrada en vigor de cualquier modificación de esta Política de Cookies implica la aceptación de dicha modificación, en lo que respecta a las cookies técnicas necesarias. Para cualquier cookie que requiera consentimiento, se solicitará un nuevo consentimiento específico.</p>

        <h2 style={{ fontSize:18, fontWeight:700, marginTop:28, marginBottom:8 }}>10. Información Adicional y Contacto</h2>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}>10.1. Para más información sobre cómo {s.app_name} protege sus datos personales, consulte nuestra Política de Privacidad y nuestros Términos y Condiciones.</p>
        <p style={{ color:"var(--text-dim)", marginBottom:6 }}>10.2. Si tiene preguntas, comentarios o inquietudes sobre esta Política de Cookies, sobre nuestras prácticas de privacidad o sobre sus derechos como titular de datos personales, no dude en contactarnos:</p>
        <p style={{ color:"var(--text-dim)", marginBottom:6 }}><strong>Correo electrónico:</strong> {s.privacy_email}</p>
        <p style={{ color:"var(--text-dim)", marginBottom:6 }}><strong>Dirección:</strong> {s.legal_address}</p>
        <p style={{ color:"var(--text-dim)", marginBottom:12 }}><strong>Sitio web:</strong> {s.app_url || "http://localhost:3000"}</p>

      </div>
    </div>
  );
}
