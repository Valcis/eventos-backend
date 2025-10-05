export type SelectorItem = { id?: string; nombre: string };
export type Selectores = {
    comercial?: SelectorItem[];
    metodoPago?: SelectorItem[];
    receptor?: SelectorItem[];
    tipoConsumo?: SelectorItem[];
    puntoRecogida?: SelectorItem[];
};

export type SelectorMaps = {
    comercial: Record<string, string>;
    metodoPago: Record<string, string>;
    receptor: Record<string, string>;
    tipoConsumo: Record<string, string>;
    puntoRecogida: Record<string, string>;
};

export function buildSelectorMaps(selectores: Partial<Selectores> | undefined): SelectorMaps {
    const make = (arr?: SelectorItem[]) =>
        (arr ?? []).reduce<Record<string, string>>((acc, it) => {
            if (it.id) acc[it.id] = it.nombre;
            return acc;
        }, {});
    return {
        comercial: make(selectores?.comercial),
        metodoPago: make(selectores?.metodoPago),
        receptor: make(selectores?.receptor),
        tipoConsumo: make(selectores?.tipoConsumo),
        puntoRecogida: make(selectores?.puntoRecogida)
    };
}
