export function adjustColor(baseColor,secondColor, noise) {
    let r = (baseColor >> 16) & 0xFF;
    let g = (baseColor >> 8) & 0xFF;
    let b = baseColor & 0xFF;
    if(secondColor==0x7AC97A){
        console.log("second color is 7AC97A");
    }
    const factor = 0.95 + noise * 0.1;
    if(noise >0.5){
        r = (secondColor >> 16) & 0xFF;
        g = (secondColor >> 8) & 0xFF;
        b = secondColor & 0xFF;
    }

    const newR = Math.min(255, Math.max(0, Math.floor(r * factor)));
    const newG = Math.min(255, Math.max(0, Math.floor(g * factor)));
    const newB = Math.min(255, Math.max(0, Math.floor(b * factor)));

    return (newR << 16) | (newG << 8) | newB;
}