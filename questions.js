/* Banco de preguntas. Los ids (paquete-posición) deben mantenerse: añade preguntas nuevas siempre al final de cada lista. */
export const PACKS = {
  clasicas:{n:"Clásicas",d:"Las de toda la vida, para calentar"},
  amistad:{n:"Amistad",d:"Quién está cuando hace falta"},
  picante:{n:"Picante",d:"Sexo, ligues y vergüenza ajena",adult:true},
  peligro:{n:"Peligro",d:"Malas ideas y riesgos absurdos"},
  habilidades:{n:"Habilidades",d:"Talentos útiles e inútiles"},
  absurdas:{n:"Absurdas",d:"Escenarios que no pasarán nunca"},
};
export const BANK = {
  clasicas:[
    "¿Quién llegaría tarde a su propia boda?","¿Quién se haría viral por el motivo más tonto?","¿Quién viviría en otro país dentro de cinco años?",
    "¿Quién lloraría con un anuncio de turrones?","¿Quién olvidaría el móvil en un taxi en su primer día de vacaciones?","¿Quién sería millonario antes de los 40… y lo perdería todo a los 41?",
    "¿Quién se quedaría dormido en el cine en la escena más importante?","¿Quién tendría el grupo de WhatsApp silenciado desde 2019?"
  ],
  amistad:[
    "¿Quién cogería el coche a las 3 de la mañana si le llamas sin decir para qué?","¿Quién se acuerda de un detalle que le contaste hace dos años?",
    "¿Quién guardaría tu secreto incluso si le interroga tu madre?","¿Quién te diría que ese corte de pelo es un error antes de que salgas de casa?",
    "¿Quién organizaría tu fiesta sorpresa sin que se le escape nada?","¿Quién te ayudaría a mudarte a un cuarto sin ascensor en pleno agosto?",
    "¿Quién aparecería con caldo y mantas si estás malo?","¿Quién mantendría vivo el grupo si cada uno se fuera a un país distinto?",
    "¿Quién escucharía entera tu nota de voz de nueve minutos?","¿Quién te defendería en una discusión aunque no tengas razón?",
    "¿Quién recuerda todos los cumpleaños sin mirar el móvil?","¿Quién se sabe tu pedido exacto en tu bar de siempre?",
    "¿Quién sería el mejor padrino o madrina para tu boda?","¿Quién te prestaría dinero sin preguntar para qué es?"
  ],
  picante:[
    "¿Quién tiene la playlist más peligrosa para una cita en casa?","¿Quién ha mandado un mensaje subido de tono a la persona equivocada?",
    "¿Quién tiene el historial de búsqueda que menos aguantaría proyectado en una boda?","¿Quién liga mejor sin decir una sola palabra?",
    "¿Quién tiene un tatuaje en un sitio que ha visto muy poca gente?","¿Quién ha dicho el nombre equivocado en el peor momento posible?",
    "¿Quién tiene más ex que siguen viendo todas sus stories?","¿Quién tiene el cajón de la mesilla con más secretos?",
    "¿Quién ha ligado en el sitio más inapropiado: un funeral, una boda o un examen?","¿Quién tiene una fantasía que nos dejaría con la boca abierta?",
    "¿Quién ha vuelto a casa un domingo por la mañana con la ropa del sábado más veces?","¿Quién se liaría con alguien del trabajo y lo negaría hasta la muerte?",
    "¿Quién sabe más trucos que no aprendió en ninguna clase?","¿Quién sería el último en apagar la luz por vergüenza?"
  ],
  peligro:[
    "¿Quién acabaría acariciando a un animal salvaje porque «parecía majo»?","¿Quién se apuntaría a saltar en paracaídas y se rajaría en la puerta del avión?",
    "¿Quién comería una seta del monte porque «se parece a las del súper»?","¿Quién se metería en una cueva sin linterna por una apuesta de 5 €?",
    "¿Quién haría 80 km con la reserva encendida convencido de que llega?","¿Quién intentaría arreglar un enchufe sin bajar los plomos?",
    "¿Quién saltaría desde la roca más alta de la cala sin mirar la profundidad?","¿Quién se perdería en una ruta marcada con flechas pintadas cada diez metros?",
    "¿Quién pediría el picante que el camarero recomienda no pedir?","¿Quién diría «¿qué puede salir mal?» justo antes del desastre?",
    "¿Quién se colaría en la boda de unos desconocidos para comer gratis?","¿Quién bajaría una pista negra el primer día que se pone unos esquís?",
    "¿Quién subiría a la azotea de un edificio «para ver mejor los fuegos»?","¿Quién se haría un tatuaje en un viaje después de la tercera ronda?"
  ],
  habilidades:[
    "¿Quién sobreviviría una semana solo con lo que venden en una gasolinera?","¿Quién montaría un mueble sin instrucciones y sin que sobre ni un tornillo?",
    "¿Quién ganaría un concurso de imitar acentos?","¿Quién convencería a un revisor de que no le multe?",
    "¿Quién aprendería un idioma solo viendo series?","¿Quién hace la mejor tortilla del grupo, con o sin cebolla?",
    "¿Quién aparca a la primera en un hueco imposible?","¿Quién podría vivir de algo que hace con las manos?",
    "¿Quién se orientaría sin mapa en una ciudad que no conoce?","¿Quién ganaría un debate defendiendo algo en lo que no cree?",
    "¿Quién cocinaría un menú de tres platos con 10 €?","¿Quién saldría de un escape room sin pedir ni una pista?",
    "¿Quién regatearía mejor el precio de un piso?","¿Quién dibujaría el retrato más reconocible de todos en dos minutos?"
  ],
  absurdas:[
    "¿Quién acabaría haciéndose amigo del fantasma de una casa encantada?","¿Quién tendría una discusión seria con un asistente de voz?",
    "¿Quién acabaría liderando una secta sin haberlo buscado?","¿Quién tiene más pinta de haber viajado en el tiempo y no decirlo?",
    "¿Quién se haría rico vendiendo algo absurdo por internet?","¿Quién sería el personaje que da la misión secundaria en un videojuego?",
    "¿Quién hablaría con las plantas y juraría que le contestan?","¿Quién sería el último humano en enterarse de una invasión alienígena?",
    "¿Quién se casaría con alguien que conoció en la cola de renovar el DNI?","¿Quién sobreviviría más en una isla desierta con solo un microondas?",
    "¿Quién empezaría una revolución en la comunidad de vecinos?","¿Quién sería contratado como villano de una peli de dibujos sin hacer casting?",
    "¿Quién tendría una paloma como mejor amiga en otra vida?","¿Quién sería invitado a un programa de la tele por error y triunfaría?"
  ],
};
export const DUELS = {
  2:[
    "¿Quién ganaría un torneo de futbolín?","¿Quién aguantaría más tiempo sin mirar el móvil?","¿Quién ganaría una pelea de almohadas dentro de un ascensor?",
    "¿Quién conseguiría antes que un desconocido le invite a un café?","¿Quién comería más croquetas en cinco minutos?","¿Quién ganaría un duelo de miradas sin parpadear?",
    "¿Quién montaría antes una tienda de campaña a oscuras?","¿Quién ganaría un pulso con la mano mala?","¿Quién llegaría antes a Cuenca haciendo autostop?",
    "¿Quién saldría elegido alcalde si os presentáis los dos?","¿Quién calmaría antes a un bebé que no para de llorar?","¿Quién conseguiría más likes con una foto de su desayuno?",
    "¿Quién ganaría un concurso de bailar con los ojos cerrados?","¿Quién aguantaría más en una sala con un mimo que no para de imitarle?"
  ],
  3:[
    "¿Quién de los tres ganaría una partida a muerte de Uno?","¿Quién de los tres sobreviviría más rondas en un concurso de la tele?","¿Quién de los tres convencería antes a un portero de discoteca?",
    "¿Quién de los tres encontraría antes las llaves perdidas en un festival?","¿Quién de los tres ganaría un concurso de karaoke con la peor canción posible?",
    "¿Quién de los tres sería el último en pie en un juego de las sillas?","¿Quién de los tres negociaría mejor la liberación de un rehén imaginario?",
    "¿Quién de los tres vendería antes un boli a un desconocido?"
  ]
};
/* {e} se sustituye por "pareja", "trío" o "equipo" según el tamaño */
export const TEAMQ=[
  "¿Qué {e} ganaría una partida de futbolín a diez goles?","¿Qué {e} saldría antes de un escape room?","¿Qué {e} ganaría al Pictionary en la sobremesa de Navidad?",
  "¿Qué {e} montaría el mejor chiringuito de playa en un fin de semana?","¿Qué {e} duraría más en un reality en una isla desierta?","¿Qué {e} cocinaría mejor con lo que sobra en la nevera?",
  "¿Qué {e} ganaría la gymkana de una despedida de soltero?","¿Qué {e} daría el mejor golpe en una peli de atracos?","¿Qué {e} ganaría el concurso de disfraces de Carnaval?",
  "¿Qué {e} perdería antes el coche en el parking del aeropuerto?","¿Qué {e} ganaría una partida de mus apostando la cena?","¿Qué {e} acertaría más en un trivial a las 4 de la mañana?",
  "¿Qué {e} ganaría una guerra de bolas de nieve?","¿Qué {e} se perdería antes en una ruta de montaña?","¿Qué {e} cantaría peor en un karaoke y lo daría todo igual?",
  "¿Qué {e} conseguiría más firmas para una causa absurda en una hora?","¿Qué {e} ganaría una carrera de relevos con una cuchara y un huevo?","¿Qué {e} se pondría antes de acuerdo para elegir restaurante?",
  "¿Qué {e} haría una mudanza sin romper nada?","¿Qué {e} construiría la torre más alta con espaguetis?"
];
export const teamWord=k=>k===2?"pareja":k===3?"trío":"equipo";
export const BANK_IDX=[];for(const p in BANK)BANK[p].forEach((t,i)=>BANK_IDX.push({id:p+"-"+i,text:t,pack:p}));
