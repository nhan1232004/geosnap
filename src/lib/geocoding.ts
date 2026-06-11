export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`);
    
    if (!res.ok) throw new Error("Reverse geocoding failed");
    
    const data = await res.json();
    
    const components = [];
    if (data.locality) components.push(data.locality);
    if (data.city && data.city !== data.locality) components.push(data.city);
    if (data.principalSubdivision && data.principalSubdivision !== data.city) components.push(data.principalSubdivision);
    
    if (components.length > 0) return components.join(", ");
    return data.countryName || `Vị trí tại ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error("Geocoding error:", error);
    return `Vị trí tại ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
