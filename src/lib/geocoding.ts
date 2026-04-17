export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
      headers: {
        'Accept-Language': 'vi,en',
        'User-Agent': 'GeoSnap-AIStudioApp/1.0'
      }
    });
    
    if (!res.ok) throw new Error("Reverse geocoding failed");
    
    const data = await res.json();
    const address = data.address || {};
    
    // Attempt building a name: Road, District, City
    const components = [];
    if (address.road) components.push(address.road);
    if (address.suburb || address.district) components.push(address.suburb || address.district);
    if (address.city || address.town || address.state) components.push(address.city || address.town || address.state);
    
    if (components.length > 0) return components.join(", ");
    return data.display_name || "Unknown Location";
  } catch (error) {
    console.error("Geocoding error:", error);
    return "Unknown Location";
  }
}
