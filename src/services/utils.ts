export const sleep = (ms = 0) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Validation */
export const validators = {
  required: (value: any) => !!value || 'This field is required',
  email: (value: string) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return pattern.test(value) || 'Invalid email address'
  },
  digits: (length: number) => (value: string) => {
    const pattern = new RegExp(`^\\d{${length}}$`)
    return pattern.test(value) || `Must be exactly ${length} digits`
  },
}
// enum
export enum PISTON_SUBURL {
  // '/execute',
  EXECUTE = '/execute',
  RUNTIMES = '/runtimes',
}

export const orderingNumbersObjList = [
  { value: 0, text: 'First' },
  { value: 1, text: 'Second' },
  { value: 2, text: 'Third' },
  { value: 3, text: 'Fourth' },
  { value: 4, text: 'Fifth' },
  { value: 5, text: 'Sixth' },
  { value: 6, text: 'Seventh' },
  { value: 7, text: 'Eighth' },
  { value: 8, text: 'Ninth' },
  { value: 9, text: 'Tenth' },
  { value: 10, text: 'Eleventh' },
  { value: 11, text: 'Twelfth' },
  { value: 12, text: 'Thirteenth' },
  { value: 13, text: 'Fourteenth' },
  { value: 14, text: 'Fifteenth' },
  { value: 15, text: 'Sixteenth' },
  { value: 16, text: 'Seventeenth' },
  { value: 17, text: 'Eighteenth' },
  { value: 18, text: 'Nineteenth' },
  { value: 19, text: 'Twentieth' },
  { value: 20, text: 'Twenty-first' },
  { value: 21, text: 'Twenty-second' },
  { value: 22, text: 'Twenty-third' },
  { value: 23, text: 'Twenty-fourth' },
  { value: 24, text: 'Twenty-fifth' },
  { value: 25, text: 'Twenty-sixth' },
  { value: 26, text: 'Twenty-seventh' },
  { value: 27, text: 'Twenty-eighth' },
  { value: 28, text: 'Twenty-ninth' },
  { value: 29, text: 'Thirtieth' },
  { value: 30, text: 'Thirty-first' },
  { value: 31, text: 'Thirty-second' },
  { value: 32, text: 'Thirty-third' },
  { value: 33, text: 'Thirty-fourth' },
  { value: 34, text: 'Thirty-fifth' },
  { value: 35, text: 'Thirty-sixth' },
  { value: 36, text: 'Thirty-seventh' },
  { value: 37, text: 'Thirty-eighth' },
  { value: 38, text: 'Thirty-ninth' },
  { value: 39, text: 'Fortieth' },
  { value: 40, text: 'Forty-first' },
  { value: 41, text: 'Forty-second' },
  { value: 42, text: 'Forty-third' },
  { value: 43, text: 'Forty-fourth' },
  { value: 44, text: 'Forty-fifth' },
  { value: 45, text: 'Forty-sixth' },
  { value: 46, text: 'Forty-seventh' },
  { value: 47, text: 'Forty-eighth' },
  { value: 48, text: 'Forty-ninth' },
  { value: 49, text: 'Fifty' },
  { value: 50, text: 'Fifty-first' },
  { value: 51, text: 'Fifty-second' },
  { value: 52, text: 'Fifty-third' },
  { value: 53, text: 'Fifty-fourth' },
  { value: 54, text: 'Fifty-fifth' },
  { value: 55, text: 'Fifty-sixth' },
  { value: 56, text: 'Fifty-seventh' },
  { value: 57, text: 'Fifty-eighth' },
  { value: 58, text: 'Fifty-ninth' },
  { value: 59, text: 'Fiftieth' },
  { value: 60, text: 'Fifty-first' },
  { value: 61, text: 'Fifty-second' },
  { value: 62, text: 'Fifty-third' },
  { value: 63, text: 'Fifty-fourth' },
  { value: 64, text: 'Fifty-fifth' },
  { value: 65, text: 'Fifty-sixth' },
  { value: 66, text: 'Fifty-seventh' },
  { value: 67, text: 'Fifty-eighth' },
  { value: 68, text: 'Fifty-ninth' },
  { value: 69, text: 'Sixtieth' },
  { value: 70, text: 'Sixty-first' },
  { value: 71, text: 'Sixty-second' },
  { value: 72, text: 'Sixty-third' },
  { value: 73, text: 'Sixty-fourth' },
  { value: 74, text: 'Sixty-fifth' },
  { value: 75, text: 'Sixty-sixth' },
  { value: 76, text: 'Sixty-seventh' },
  { value: 77, text: 'Sixty-eighth' },
  { value: 78, text: 'Sixty-ninth' },
  { value: 79, text: 'Seventieth' },
  { value: 80, text: 'Seventy-first' },
  { value: 81, text: 'Seventy-second' },
  { value: 82, text: 'Seventy-third' },
  { value: 83, text: 'Seventy-fourth' },
  { value: 84, text: 'Seventy-fifth' },
  { value: 85, text: 'Seventy-sixth' },
  { value: 86, text: 'Seventy-seventh' },
  { value: 87, text: 'Seventy-eighth' },
  { value: 88, text: 'Seventy-ninth' },
  { value: 89, text: 'Eightieth' },
  { value: 90, text: 'Eighty-first' },
  { value: 91, text: 'Eighty-second' },
  { value: 92, text: 'Eighty-third' },
  { value: 93, text: 'Eighty-fourth' },
  { value: 94, text: 'Eighty-fifth' },
  { value: 95, text: 'Eighty-sixth' },
  { value: 96, text: 'Eighty-seventh' },
  { value: 97, text: 'Eighty-eighth' },
  { value: 98, text: 'Eighty-ninth' },
  { value: 99, text: 'Ninety' },
  { value: 100, text: 'Ninety-first' },
]

export const publicationStatusOptions = [
  { value: 'published', text: 'Published' },
  { value: 'draft', text: 'Draft' },
]
export const levelOptions = [
  { value: 'beginner', text: 'Beginner' },
  { value: 'intermediate', text: 'Intermediate' },
  { value: 'expert', text: 'Expert' },
]

export enum LessonType {
  NORMAL = 'NORMAL',
  QUIZ = 'QUIZ',
  WEEKLY_CAPSTONE = 'WEEKLY_CAPSTONE',
  MIDTERM_CAPSTONE = 'MIDTERM_CAPSTONE',
  FINAL_CAPSTONE = 'FINAL_CAPSTONE',
}

export enum LearningModel {
  SOLO = 'SOLO',
  GROUP = 'GROUP',
  HYBRID = 'HYBRID',
}
