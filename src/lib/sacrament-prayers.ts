export const SACRAMENT_PRAYERS = {
    en: {
        bread: `O God, the Eternal Father, we ask thee in the name of thy Son, Jesus Christ, to bless and sanctify this bread to the souls of all those who partake of it, that they may eat in remembrance of the body of thy Son, and witness unto thee, O God, the Eternal Father, that they are willing to take upon them the name of thy Son, and always remember him and keep his commandments which he has given them; that they may always have his Spirit to be with them. Amen.`,
        water: `O God, the Eternal Father, we ask thee in the name of thy Son, Jesus Christ, to bless and sanctify this water to the souls of all those who drink of it, that they may do it in remembrance of the blood of thy Son, which was shed for them; that they may witness unto thee, O God, the Eternal Father, that they do always remember him, that they may have his Spirit to be with them. Amen.`
    },
    es: {
        bread: `Oh Dios, Padre Eterno, en el nombre de tu Hijo Jesucristo, te pedimos que bendigas y santifiques este pan para las almas de todos los que participen de él, para que lo coman en memoria del cuerpo de tu Hijo, y testifiquen ante ti, oh Dios, Padre Eterno, que están dispuestos a tomar sobre sí el nombre de tu Hijo, y a recordarle siempre, y a guardar sus mandamientos que él les ha dado, para que siempre puedan tener su Espíritu consigo. Amén.`,
        water: `Oh Dios, Padre Eterno, en el nombre de tu Hijo Jesucristo, te pedimos que bendigas y santifiques esta agua para las almas de todos los que la beban, para que lo hagan en memoria de la sangre de tu Hijo, que por ellos se derramó; para que testifiquen ante ti, oh Dios, Padre Eterno, que siempre se acuerdan de él, para que puedan tener su Espíritu consigo. Amén.`
    }
};

export function getSacramentPrayersText(language: "en" | "es" | string): string {
    if (language === "es") {
        return `**Bendición del Pan**\n${SACRAMENT_PRAYERS.es.bread}\n\n**Bendición del Agua**\n${SACRAMENT_PRAYERS.es.water}`;
    }
    
    // Default to English
    return `**Blessing on the Bread**\n${SACRAMENT_PRAYERS.en.bread}\n\n**Blessing on the Water**\n${SACRAMENT_PRAYERS.en.water}`;
}
