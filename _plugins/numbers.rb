# frozen_string_literal: true

# Thousands separators.
#
# Liquid has no number formatting and Jekyll adds none, so 83195 renders as
# 83195. That is legible in a table cell and wrong at 6rem: a number set large
# enough to be the first thing anyone reads has to be readable at a glance, and
# grouping is what makes it so.
#
# The classic GitHub Pages build would have ignored this file. We run our own
# build, so a filter is available and is the right place for a formatting
# concern that would otherwise be repeated in every template that shows a total.
module NewfoldFilters
  # 83195 -> "83,195". Passes anything non-numeric through untouched rather than
  # raising, so a null in the data renders as nothing instead of failing a build.
  def thousands(input)
    return input if input.nil?

    number = input.to_s
    return input unless number.match?(/\A-?\d+\z/)

    sign = number.start_with?('-') ? '-' : ''
    digits = number.delete('-')
    "#{sign}#{digits.reverse.scan(/\d{1,3}/).join(',').reverse}"
  end
end

Liquid::Template.register_filter(NewfoldFilters)
