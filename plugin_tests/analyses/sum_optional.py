def run(a, b, multiply=False):
    """Sum a list of numbers passed to run, if multiply is non-nill
    then multiply the numbers instead of summing them

    :param a: first summand
    :type a: int
    :param b: second summand
    :type b: int
    :param multiply: multiply instead of add
    :type multiply: bool

    """
    if multiply:
        return a * b
    else:
        return a + b
