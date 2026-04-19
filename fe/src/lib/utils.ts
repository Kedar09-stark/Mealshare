export function formatFoodItems(foodItems: any): string {
  if (!foodItems) return '';
  if (Array.isArray(foodItems)) {
    return foodItems.join(', ');
  }
  if (typeof foodItems === 'string') {
    try {
      const parsed = JSON.parse(foodItems);
      if (Array.isArray(parsed)) {
        return parsed.join(', ');
      }
    } catch (e) {
      // Not a JSON string, return as is
    }
  }
  return String(foodItems);
}
